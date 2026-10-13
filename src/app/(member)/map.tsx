import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import Feather from '@expo/vector-icons/Feather';

import { palette, useCopy } from '@/components/member-ui';
import { useMember } from '@/lib/member-context';
import { supabase } from '@/lib/supabase';

type FishingSpot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type Coordinate = { latitude: number; longitude: number };
type WindSummary = { speed: number | null; direction: number | null; time: string | null; error: boolean };
const WIND_FORECAST_OFFSETS = Array.from({ length: 73 }, (_, hour) => hour);
type MapMessage =
  | { type: 'ready' }
  | { type: 'error'; message?: string }
  | { type: 'select'; latitude: number; longitude: number }
  | { type: 'spot'; id: string }
  | { type: 'wind'; latitude?: number; longitude?: number; speed: number | null; direction: number | null; time: string | null; error?: boolean };

const MAP_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.css" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #dce8e5; }
      #wind-canvas { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
      .wind-focus-marker { width: 30px; height: 30px; z-index: 4; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(19, 46, 39, 0.28)); }
      .wind-focus-marker svg { display: block; width: 100%; height: 100%; overflow: visible; }
    </style>
    <script src="https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.js"></script>
  </head>
  <body>
    <div id="map" aria-label="Interactive map of Cyprus"></div>
    <canvas id="wind-canvas" aria-hidden="true"></canvas>
    <script>
      (function () {
        const post = (message) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
        const empty = { type: 'FeatureCollection', features: [] };
        let selectedId = null;
        let followCurrentLocation = true;
        let windUsesGps = true;
        let windLayerEnabled = false;
        let windForecastOffset = 0;
        let latestCoordinate = null;
        let windFocusMarker = null;
        let map;
        const windCache = new Map();
        const windSummaryRequests = new Set();

        function windAtForecastOffset(forecast, offset) {
          if (!forecast) return null;
          if (!offset && forecast.current) return forecast.current;
          const hourly = forecast.hourly;
          if (!hourly || !Array.isArray(hourly.time)) return forecast.current || null;
          const currentHour = forecast.current && forecast.current.time
            ? forecast.current.time.slice(0, 13) + ':00'
            : null;
          const baseIndex = currentHour ? hourly.time.indexOf(currentHour) : 0;
          const index = Math.max(0, baseIndex) + Math.max(0, Math.round(offset));
          const speed = Number(hourly.wind_speed_10m && hourly.wind_speed_10m[index]);
          const direction = Number(hourly.wind_direction_10m && hourly.wind_direction_10m[index]);
          if (!Number.isFinite(speed) || !Number.isFinite(direction)) return null;
          return { wind_speed_10m: speed, wind_direction_10m: direction, time: hourly.time[index] || null };
        }

        function postWind(coordinate, current) {
          post({
            type: 'wind', latitude: coordinate.latitude, longitude: coordinate.longitude,
            speed: Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m : null,
            direction: Number.isFinite(current.wind_direction_10m) ? current.wind_direction_10m : null,
            time: current.time || null
          });
        }

        async function loadWindSummary(latitude, longitude) {
          if (!windLayerEnabled) return;
          const key = latitude.toFixed(1) + ',' + longitude.toFixed(1);
          const cached = windCache.get(key);
          if (cached && Date.now() - cached.savedAt < 10 * 60 * 1000) {
            const selected = windAtForecastOffset(cached.forecast, windForecastOffset);
            if (selected) postWind({ latitude, longitude }, selected);
            return;
          }
          if (windSummaryRequests.has(key)) return;
          windSummaryRequests.add(key);
          try {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + latitude + '&longitude=' + longitude + '&current=wind_speed_10m,wind_direction_10m&hourly=wind_speed_10m,wind_direction_10m&forecast_hours=74&wind_speed_unit=kmh&cell_selection=sea&timezone=auto';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            let response;
            try { response = await fetch(url, { signal: controller.signal }); }
            finally { clearTimeout(timeout); }
            if (!response.ok) throw new Error('Weather request failed');
            const result = await response.json();
            const selected = windAtForecastOffset(result, windForecastOffset);
            if (!selected) throw new Error('Wind data unavailable');
            windCache.set(key, { forecast: result, savedAt: Date.now() });
            postWind({ latitude, longitude }, selected);
          } catch {
            post({ type: 'wind', speed: null, direction: null, time: null, error: true });
          } finally {
            windSummaryRequests.delete(key);
          }
        }

        let windAnimationFrame = null;
        let windRefreshInterval = null;
        let windLastFrame = 0;
        let windFeatures = [];
        let windGrid = new Map();
        let windFieldLocations = [];
        let windParticles = [];
        let windFieldLoading = false;
        let windFieldSavedAt = 0;
        const windCanvas = document.getElementById('wind-canvas');
        const windContext = windCanvas && windCanvas.getContext('2d');
        const windCanvasAvailable = Boolean(windCanvas && windContext);
        const windFieldMaxAge = 15 * 60 * 1000;
        const windGridLatitude = 34;
        const windGridLongitude = 32;
        const windGridStep = 0.15;
        const windGridColumns = 21;
        const windGridRows = 11;

        function windVectorAt(coordinate) {
          const gridX = Math.max(0, Math.min(windGridColumns - 1, (coordinate.lng - windGridLongitude) / windGridStep));
          const gridY = Math.max(0, Math.min(windGridRows - 1, (coordinate.lat - windGridLatitude) / windGridStep));
          const left = Math.floor(gridX);
          const top = Math.floor(gridY);
          const right = Math.min(windGridColumns - 1, left + 1);
          const bottom = Math.min(windGridRows - 1, top + 1);
          const horizontal = gridX - left;
          const vertical = gridY - top;
          const samples = [
            [top, left, (1 - horizontal) * (1 - vertical)],
            [top, right, horizontal * (1 - vertical)],
            [bottom, left, (1 - horizontal) * vertical],
            [bottom, right, horizontal * vertical]
          ];
          let vectorX = 0;
          let vectorY = 0;
          let totalWeight = 0;
          samples.forEach(sample => {
            const value = windGrid.get(sample[0] + ',' + sample[1]);
            const weight = sample[2];
            if (!value || weight <= 0) return;
            const radians = ((value.direction + 180) % 360) * Math.PI / 180;
            const strength = Math.max(1, value.speed);
            vectorX += Math.sin(radians) * strength * weight;
            vectorY -= Math.cos(radians) * strength * weight;
            totalWeight += weight;
          });
          if (!totalWeight) return null;
          vectorX /= totalWeight;
          vectorY /= totalWeight;
          return { x: vectorX, y: vectorY, speed: Math.hypot(vectorX, vectorY) };
        }

        function seedWindParticle(particle, randomizeAge) {
          if (!map || !windCanvas) return false;
          const bounds = windCanvas.getBoundingClientRect();
          for (let attempt = 0; attempt < 18; attempt += 1) {
            const x = Math.random() * bounds.width;
            const y = Math.random() * bounds.height;
            const coordinate = map.unproject([x, y]);
            if (coordinate.lat < 33.95 || coordinate.lat > 35.56 || coordinate.lng < 31.95 || coordinate.lng > 35.06) continue;
            const vector = windVectorAt(coordinate);
            if (!vector) continue;
            const magnitude = Math.max(0.001, Math.hypot(vector.x, vector.y));
            const visualSpeed = 0.18 + Math.min(30, vector.speed) * 0.022;
            particle.x = x;
            particle.y = y;
            particle.vx = vector.x / magnitude * visualSpeed;
            particle.vy = vector.y / magnitude * visualSpeed;
            particle.age = randomizeAge ? Math.random() * 3200 : 0;
            particle.maxAge = 1800 + Math.random() * 2200;
            particle.length = 6 + Math.min(18, vector.speed) * 0.22;
            return true;
          }
          return false;
        }

        function resizeWindCanvas() {
          if (!windCanvas || !windContext) return;
          const bounds = windCanvas.getBoundingClientRect();
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          const width = Math.max(1, Math.round(bounds.width * pixelRatio));
          const height = Math.max(1, Math.round(bounds.height * pixelRatio));
          if (windCanvas.width !== width || windCanvas.height !== height) {
            windCanvas.width = width;
            windCanvas.height = height;
          }
          windContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        }

        function refreshWindParticles() {
          if (!windLayerEnabled || !windFeatures.length || !windCanvas || !windContext) return;
          resizeWindCanvas();
          const bounds = windCanvas.getBoundingClientRect();
          const targetCount = Math.max(110, Math.min(220, Math.round(bounds.width * bounds.height / 1750)));
          windParticles = [];
          for (let index = 0; index < targetCount; index += 1) {
            const particle = {};
            if (seedWindParticle(particle, true)) windParticles.push(particle);
          }
        }

        function renderWindParticles(timestamp) {
          if (!windContext || !windCanvas || !windParticles.length) return;
          const bounds = windCanvas.getBoundingClientRect();
          const delta = windLastFrame ? Math.min(2, (timestamp - windLastFrame) / 16.667) : 1;
          windLastFrame = timestamp;
          windContext.clearRect(0, 0, bounds.width, bounds.height);
          windContext.lineCap = 'round';
          windParticles.forEach(particle => {
            particle.age += delta * 16.667;
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            if (particle.age >= particle.maxAge || particle.x < -20 || particle.x > bounds.width + 20 || particle.y < -20 || particle.y > bounds.height + 20) {
              if (!seedWindParticle(particle, false)) return;
            }
            const progress = Math.max(0, Math.min(1, particle.age / particle.maxAge));
            const opacity = 0.42 + Math.sin(progress * Math.PI) * 0.52;
            const velocity = Math.max(0.001, Math.hypot(particle.vx, particle.vy));
            const tailX = particle.x - particle.vx / velocity * particle.length;
            const tailY = particle.y - particle.vy / velocity * particle.length;
            windContext.beginPath();
            windContext.moveTo(tailX, tailY);
            windContext.lineTo(particle.x, particle.y);
            windContext.strokeStyle = 'rgba(22, 52, 62, ' + (opacity * 0.52) + ')';
            windContext.lineWidth = 3.2;
            windContext.stroke();
            windContext.beginPath();
            windContext.moveTo(tailX, tailY);
            windContext.lineTo(particle.x, particle.y);
            windContext.strokeStyle = 'rgba(255, 255, 255, ' + Math.min(1, opacity + 0.04) + ')';
            windContext.lineWidth = 1.65;
            windContext.stroke();
          });
        }

        function animateWindParticles(timestamp) {
          windAnimationFrame = null;
          if (!windLayerEnabled || document.hidden || !windFeatures.length || !map) return;
          renderWindParticles(timestamp);
          windAnimationFrame = requestAnimationFrame(animateWindParticles);
        }

        function startWindAnimation() {
          if (windAnimationFrame !== null || !windLayerEnabled || document.hidden || !windFeatures.length || !windCanvasAvailable) return;
          if (!windParticles.length) refreshWindParticles();
          windLastFrame = performance.now();
          windAnimationFrame = requestAnimationFrame(animateWindParticles);
        }

        function stopWindAnimation() {
          if (windAnimationFrame !== null) cancelAnimationFrame(windAnimationFrame);
          windAnimationFrame = null;
          windLastFrame = 0;
          if (windContext && windCanvas) {
            const bounds = windCanvas.getBoundingClientRect();
            windContext.clearRect(0, 0, bounds.width, bounds.height);
          }
        }

        document.addEventListener('visibilitychange', function () {
          if (document.hidden) stopWindAnimation();
          else startWindAnimation();
        });

        function applyWindFieldForecast() {
          if (!windFieldLocations.length) return false;
          const features = [];
          const grid = new Map();
          windFieldLocations.forEach((entry, index) => {
            const selected = windAtForecastOffset(entry.forecast, windForecastOffset);
            if (!selected) return;
            const requestedCoordinate = entry.coordinate;
            const speed = Number(selected.wind_speed_10m);
            const direction = Number(selected.wind_direction_10m);
            features.push({ type: 'Feature', properties: { speed, direction, time: selected.time || null }, geometry: { type: 'Point', coordinates: [requestedCoordinate.longitude, requestedCoordinate.latitude] } });
            grid.set(Math.floor(index / windGridColumns) + ',' + (index % windGridColumns), { speed, direction });
          });
          if (!features.length) return false;
          windFeatures = features;
          windGrid = grid;
          if (windLayerEnabled) {
            refreshWindParticles();
            startWindAnimation();
          }
          return true;
        }

        async function loadWindField(forceRefresh) {
          if (windFieldLoading || (windFeatures.length && !forceRefresh)) return;
          windFieldLoading = true;
          try {
            const coordinates = [];
            for (let lat = 34; lat <= 35.51; lat += 0.15) {
              for (let lon = 32; lon <= 35.01; lon += 0.15) coordinates.push({ latitude: lat, longitude: lon });
            }
            const latitudes = coordinates.map(point => point.latitude.toFixed(2)).join(',');
            const longitudes = coordinates.map(point => point.longitude.toFixed(2)).join(',');
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + latitudes + '&longitude=' + longitudes + '&current=wind_speed_10m,wind_direction_10m&hourly=wind_speed_10m,wind_direction_10m&forecast_hours=74&wind_speed_unit=kmh&cell_selection=sea&timezone=auto';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            let response;
            try { response = await fetch(url, { signal: controller.signal }); }
            finally { clearTimeout(timeout); }
            if (!response.ok) throw new Error('Wind field request failed');
            const result = await response.json();
            const locations = Array.isArray(result) ? result : [result];
            windFieldLocations = locations.map((forecast, index) => ({ forecast, coordinate: coordinates[index] })).filter(entry => entry.coordinate);
            if (!applyWindFieldForecast()) throw new Error('Wind forecast returned no sea points');
            windFieldSavedAt = Date.now();
            if (windLayerEnabled && !latestCoordinate) {
              const first = windFeatures[0];
              postWind({ latitude: first.geometry.coordinates[1], longitude: first.geometry.coordinates[0] }, { wind_speed_10m: first.properties.speed, wind_direction_10m: first.properties.direction, time: first.properties.time });
            }
          } catch (error) {
            console.warn('[Map] Wind arrows unavailable:', error && error.message ? error.message : error);
            if (windLayerEnabled && !windFeatures.length) post({ type: 'wind', speed: null, direction: null, time: null, error: true });
          } finally {
            windFieldLoading = false;
          }
        }

        try {
          map = new maplibregl.Map({
            container: 'map',
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [33.4299, 35.1264],
            zoom: 7.2,
            minZoom: 5,
            maxZoom: 18,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
            cooperativeGestures: false
          });
          map.on('load', function () {
            map.addSource('fishing-spots', { type: 'geojson', data: empty });
            map.addSource('selected-location', { type: 'geojson', data: empty });
            map.addSource('current-location', { type: 'geojson', data: empty });
            map.addLayer({
              id: 'spot-halo',
              type: 'circle',
              source: 'fishing-spots',
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 10, 12, 15, 18, 19],
                'circle-color': '#a10f0f',
                'circle-opacity': 0.18,
                'circle-blur': 0.35
              }
            });
            map.addLayer({
              id: 'spot-circles',
              type: 'circle',
              source: 'fishing-spots',
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 6, 12, 9, 18, 12],
                'circle-color': '#a10f0f',
                'circle-stroke-color': '#fffdf9',
                'circle-stroke-width': 3,
                'circle-opacity': 0.98
              }
            });
            map.addLayer({
              id: 'spot-center',
              type: 'circle',
              source: 'fishing-spots',
              paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 12, 2, 18, 2.5],
                'circle-color': '#fffdf9',
                'circle-opacity': 0.95
              }
            });
            map.addLayer({
              id: 'spot-labels',
              type: 'symbol',
              source: 'fishing-spots',
              minzoom: 10,
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-size': 12,
                'text-offset': [0, 1.35],
                'text-anchor': 'top',
                'text-max-width': 12
              },
              paint: {
                'text-color': '#173e35',
                'text-halo-color': '#fffdf9',
                'text-halo-width': 1.5
              }
            });
            map.addLayer({
              id: 'selected-halo',
              type: 'circle',
              source: 'selected-location',
              paint: {
                'circle-radius': 15,
                'circle-color': '#a10f0f',
                'circle-opacity': 0.18,
                'circle-blur': 0.35
              }
            });
            map.addLayer({
              id: 'selected-circle',
              type: 'circle',
              source: 'selected-location',
              paint: {
                'circle-radius': 9,
                'circle-color': '#a10f0f',
                'circle-stroke-color': '#fffdf9',
                'circle-stroke-width': 3
              }
            });
            map.addLayer({
              id: 'current-location-halo',
              type: 'circle',
              source: 'current-location',
              paint: {
                'circle-radius': 15,
                'circle-color': '#1687ff',
                'circle-opacity': 0.2
              }
            });
            map.addLayer({
              id: 'current-location-dot',
              type: 'circle',
              source: 'current-location',
              paint: {
                'circle-radius': 7,
                'circle-color': '#1687ff',
                'circle-stroke-color': '#fffdf9',
                'circle-stroke-width': 2.5
              }
            });
            const windFocusElement = document.createElement('div');
            windFocusElement.className = 'wind-focus-marker';
            windFocusElement.setAttribute('aria-hidden', 'true');
            windFocusElement.innerHTML = '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M15 4v22M4 15h22" stroke="#fffdf9" stroke-width="7"/><path d="M15 4v22M4 15h22" stroke="#173e35" stroke-width="4"/></g><circle cx="15" cy="15" r="2.15" fill="#c08a26"/></svg>';
            windFocusMarker = new maplibregl.Marker({ element: windFocusElement, anchor: 'center' });

            function selectLocation(point) {
              const coordinate = map.unproject(point);
              followCurrentLocation = false;
              windUsesGps = false;
              latestCoordinate = { latitude: coordinate.lat, longitude: coordinate.lng };
              if (windLayerEnabled) setWindFocus(latestCoordinate);
              selectedId = null;
              map.setPaintProperty('spot-circles', 'circle-color', '#a10f0f');
              map.setPaintProperty('spot-halo', 'circle-color', '#a10f0f');
              map.getSource('selected-location').setData({
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [coordinate.lng, coordinate.lat] } }]
              });
              post({ type: 'select', latitude: coordinate.lat, longitude: coordinate.lng });
              loadWindSummary(coordinate.lat, coordinate.lng);
            }

            let suppressNextClick = false;
            function setWindFocus(coordinate) {
              if (!windFocusMarker) return;
              if (coordinate) windFocusMarker.setLngLat([coordinate.longitude, coordinate.latitude]).addTo(map);
              else windFocusMarker.remove();
            }

            map.on('click', function (event) {
              if (suppressNextClick) {
                suppressNextClick = false;
                return;
              }
              const features = map.queryRenderedFeatures(event.point, { layers: ['spot-circles'] });
              if (features.length) {
                followCurrentLocation = false;
                windUsesGps = false;
                latestCoordinate = { latitude: features[0].geometry.coordinates[1], longitude: features[0].geometry.coordinates[0] };
                setWindFocus(latestCoordinate);
                selectedId = String(features[0].properties.id);
                map.setPaintProperty('spot-circles', 'circle-color', '#a10f0f');
                map.setPaintProperty('spot-halo', 'circle-color', '#a10f0f');
                post({ type: 'spot', id: selectedId });
                const coordinates = features[0].geometry.coordinates;
                loadWindSummary(coordinates[1], coordinates[0]);
              } else if (windLayerEnabled) {
                followCurrentLocation = false;
                windUsesGps = false;
                latestCoordinate = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
                setWindFocus(latestCoordinate);
                post({ type: 'wind', latitude: event.lngLat.lat, longitude: event.lngLat.lng, speed: null, direction: null, time: null });
                loadWindSummary(event.lngLat.lat, event.lngLat.lng);
              }
            });

            let longPressTimer = null;
            let longPressOrigin = null;
            const mapSurface = map.getCanvasContainer();
            mapSurface.addEventListener('pointerdown', function (event) {
              if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
              longPressOrigin = { x: event.clientX, y: event.clientY };
              longPressTimer = setTimeout(function () {
                if (!longPressOrigin) return;
                const bounds = mapSurface.getBoundingClientRect();
                suppressNextClick = true;
                selectLocation([longPressOrigin.x - bounds.left, longPressOrigin.y - bounds.top]);
                longPressOrigin = null;
                longPressTimer = null;
              }, 550);
            });
            mapSurface.addEventListener('pointermove', function (event) {
              if (!longPressOrigin) return;
              if (Math.hypot(event.clientX - longPressOrigin.x, event.clientY - longPressOrigin.y) > 12) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
                longPressOrigin = null;
              }
            });
            function cancelLongPress() {
              clearTimeout(longPressTimer);
              longPressTimer = null;
              longPressOrigin = null;
            }
            mapSurface.addEventListener('pointerup', cancelLongPress);
            mapSurface.addEventListener('pointercancel', cancelLongPress);
            map.on('dragstart', function () { followCurrentLocation = false; });
            map.on('moveend', refreshWindParticles);
            map.on('resize', refreshWindParticles);
            map.on('error', function (event) {
              if (event && event.error) post({ type: 'error', message: event.error.message || 'Map request failed' });
            });
            window.SalterraMap = {
              setWindLayer: function (enabled) {
                windLayerEnabled = Boolean(enabled);
                if (windLayerEnabled && !windCanvasAvailable) {
                  post({ type: 'wind', speed: null, direction: null, time: null, error: true });
                  return;
                }
                if (windLayerEnabled) {
                  if (!windFeatures.length) loadWindField(false);
                  else {
                    refreshWindParticles();
                    startWindAnimation();
                    if (Date.now() - windFieldSavedAt >= windFieldMaxAge) loadWindField(true);
                  }
                  if (windRefreshInterval === null) {
                    windRefreshInterval = setInterval(function () {
                      loadWindField(true);
                      if (latestCoordinate) loadWindSummary(latestCoordinate.latitude, latestCoordinate.longitude);
                    }, 15 * 60 * 1000);
                  }
                  if (latestCoordinate) loadWindSummary(latestCoordinate.latitude, latestCoordinate.longitude);
                } else {
                  stopWindAnimation();
                  setWindFocus(null);
                  if (windRefreshInterval !== null) clearInterval(windRefreshInterval);
                  windRefreshInterval = null;
                }
              },
              setWindForecastOffset: function (hours) {
                windForecastOffset = Math.max(0, Math.min(72, Number(hours) || 0));
                if (windFieldLocations.length) applyWindFieldForecast();
                else if (windLayerEnabled) loadWindField(false);
                if (windLayerEnabled && latestCoordinate) {
                  loadWindSummary(latestCoordinate.latitude, latestCoordinate.longitude);
                }
              },
              setSpots: function (features) {
                if (map.getSource('fishing-spots')) map.getSource('fishing-spots').setData(features || empty);
              },
              setSelected: function (coordinate) {
                selectedId = null;
                map.setPaintProperty('spot-circles', 'circle-color', '#a10f0f');
                map.setPaintProperty('spot-halo', 'circle-color', '#a10f0f');
                const features = coordinate ? [{
                  type: 'Feature', properties: {},
                  geometry: { type: 'Point', coordinates: [coordinate.longitude, coordinate.latitude] }
                }] : [];
                map.getSource('selected-location').setData({ type: 'FeatureCollection', features: features });
              },
              setSelectedSpot: function (id) {
                selectedId = id;
                map.setPaintProperty('spot-circles', 'circle-color', '#a10f0f');
                map.setPaintProperty('spot-halo', 'circle-color', '#a10f0f');
              },
              setCurrentLocation: function (coordinate) {
                const features = coordinate ? [{
                  type: 'Feature', properties: {},
                  geometry: { type: 'Point', coordinates: [coordinate.longitude, coordinate.latitude] }
                }] : [];
                map.getSource('current-location').setData({ type: 'FeatureCollection', features: features });
              },
              updateCurrentLocation: function (coordinate) {
                this.setCurrentLocation(coordinate);
                if (!latestCoordinate) latestCoordinate = coordinate;
                if (followCurrentLocation) {
                  map.easeTo({ center: [coordinate.longitude, coordinate.latitude], duration: 500 });
                  if (windUsesGps) loadWindSummary(coordinate.latitude, coordinate.longitude);
                }
              },
              centerOnCurrentLocation: function (coordinate) {
                followCurrentLocation = true;
                windUsesGps = true;
                latestCoordinate = coordinate;
                setWindFocus(null);
                map.flyTo({ center: [coordinate.longitude, coordinate.latitude], zoom: 13, duration: 700 });
                this.setCurrentLocation(coordinate);
                loadWindSummary(coordinate.latitude, coordinate.longitude);
              },
              flyTo: function (coordinate) {
                followCurrentLocation = true;
                windUsesGps = true;
                latestCoordinate = coordinate;
                setWindFocus(null);
                map.flyTo({ center: [coordinate.longitude, coordinate.latitude], zoom: 13, duration: 700 });
                this.setSelected(null);
                this.setSelectedSpot(null);
                this.setCurrentLocation(coordinate);
                loadWindSummary(coordinate.latitude, coordinate.longitude);
              },
              zoom: function (amount) { map.zoomTo(map.getZoom() + amount, { duration: 250 }); },
              resetNorth: function () { map.easeTo({ bearing: 0, pitch: 0, duration: 350 }); }
            };
            post({ type: 'ready' });
            setTimeout(function () { loadWindField(false); }, 600);
          });
        } catch (error) {
          post({ type: 'error', message: error && error.message ? error.message : 'Map initialization failed' });
        }
      })();
    </script>
  </body>
</html>`;

function asFeatureCollection(spots: FishingSpot[]) {
  return {
    type: 'FeatureCollection',
    features: spots.map(spot => ({
      type: 'Feature',
      properties: { id: spot.id, name: spot.name },
      geometry: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
    })),
  };
}

function compassDirection(degrees: number, language: string) {
  const labels = language === 'Ελληνικά'
    ? ['Β', 'ΒΑ', 'Α', 'ΝΑ', 'Ν', 'ΝΔ', 'Δ', 'ΒΔ']
    : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return labels[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

function windForecastLabel(hours: number, greek: boolean) {
  const now = new Date();
  const forecast = new Date(now);
  if (hours > 0) {
    forecast.setMinutes(0, 0, 0);
    forecast.setHours(forecast.getHours() + hours);
  }

  const weekdays = greek
    ? ['ΚΥΡ', 'ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ']
    : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const day = `${weekdays[forecast.getDay()]} ${String(forecast.getDate()).padStart(2, '0')}/${String(forecast.getMonth() + 1).padStart(2, '0')}`;
  const time = `${String(forecast.getHours()).padStart(2, '0')}:${String(forecast.getMinutes()).padStart(2, '0')}`;
  return { day, time };
}

function MapLayerButton({ icon, label, active, disabled, onPress }: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.layerButton,
        active && styles.layerButtonActive,
        disabled && styles.layerButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Feather name={icon} size={17} color={active ? '#ffffff' : '#6f6b67'} />
      <Text style={[styles.layerButtonText, active && styles.layerButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MapScreen() {
  const copy = useCopy();
  const copyRef = useRef(copy);
  const { profile } = useMember();
  const mapRef = useRef<WebView>(null);
  const mapReadyRef = useRef(false);
  const currentLocationRef = useRef<Coordinate | null>(null);
  const [spots, setSpots] = useState<FishingSpot[]>([]);
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinate | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [spotName, setSpotName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [attributionOpen, setAttributionOpen] = useState(false);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [savingSpot, setSavingSpot] = useState(false);
  const saveInProgressRef = useRef(false);
  const [loadError, setLoadError] = useState(!supabase);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [windLayerEnabled, setWindLayerEnabled] = useState(false);
  const windLayerRef = useRef(false);
  const [windSummary, setWindSummary] = useState<WindSummary | null>(null);
  const [windForecastOffset, setWindForecastOffset] = useState(0);
  const layerScrollRef = useRef<ScrollView>(null);
  const [layerScrollX] = useState(() => new Animated.Value(0));
  const layerScrollSizeRef = useRef({ viewport: 0, content: 0 });
  const [layerScrollSize, setLayerScrollSize] = useState({ viewport: 0, content: 0 });
  const [layerTrackWidth, setLayerTrackWidth] = useState(0);
  const [layerHasOverflow, setLayerHasOverflow] = useState(false);
  const layerInteractionRef = useRef(false);
  const layerNudgeAttemptedRef = useRef(false);

  const updateLayerScrollSize = useCallback((viewport: number, content: number) => {
    layerScrollSizeRef.current = { viewport, content };
    setLayerScrollSize(previous => previous.viewport === viewport && previous.content === content
      ? previous
      : { viewport, content });
    setLayerHasOverflow(content > viewport + 1);
  }, []);

  const handleLayerViewportLayout = useCallback((event: LayoutChangeEvent) => {
    updateLayerScrollSize(event.nativeEvent.layout.width, layerScrollSizeRef.current.content);
  }, [updateLayerScrollSize]);

  const handleLayerContentSizeChange = useCallback((width: number) => {
    updateLayerScrollSize(layerScrollSizeRef.current.viewport, width);
  }, [updateLayerScrollSize]);

  const markLayerInteracted = useCallback(() => {
    layerInteractionRef.current = true;
    layerNudgeAttemptedRef.current = true;
  }, []);

  const layerMaxOffset = Math.max(0, layerScrollSize.content - layerScrollSize.viewport);
  const layerThumbWidth = layerTrackWidth > 0 && layerScrollSize.content > 0
    ? Math.min(layerTrackWidth, Math.max(28, layerTrackWidth * layerScrollSize.viewport / layerScrollSize.content * 0.85))
    : 0;
  const layerThumbTravel = Math.max(0, layerTrackWidth - layerThumbWidth);
  const layerThumbTranslate = layerScrollX.interpolate({
    inputRange: [0, Math.max(1, layerMaxOffset)],
    outputRange: [0, layerThumbTravel],
    extrapolate: 'clamp',
  });

  useFocusEffect(
    useCallback(() => {
      if (!mapReady || layerNudgeAttemptedRef.current) return;
      layerInteractionRef.current = false;
      let movedForNudge = false;
      let returnTimer: ReturnType<typeof setTimeout> | undefined;
      const nudgeTimer = setTimeout(() => {
        if (layerInteractionRef.current) {
          layerNudgeAttemptedRef.current = true;
          return;
        }

        const maxOffset = Math.max(0, layerScrollSizeRef.current.content - layerScrollSizeRef.current.viewport);
        const nudgeOffset = Math.min(48, maxOffset);
        if (nudgeOffset < 12) {
          layerNudgeAttemptedRef.current = true;
          return;
        }

        layerNudgeAttemptedRef.current = true;
        movedForNudge = true;
        layerScrollRef.current?.scrollTo({ x: nudgeOffset, y: 0, animated: true });
        returnTimer = setTimeout(() => {
          if (!layerInteractionRef.current) {
            layerScrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
          }
        }, 850);
      }, 2000);

      return () => {
        clearTimeout(nudgeTimer);
        if (returnTimer) clearTimeout(returnTimer);
        if (movedForNudge && !layerInteractionRef.current) {
          layerScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
        }
      };
    }, [mapReady]),
  );

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const selectedSpot = useMemo(
    () => spots.find(spot => spot.id === selectedSpotId) ?? null,
    [selectedSpotId, spots],
  );

  const inject = useCallback((expression: string) => {
    mapRef.current?.injectJavaScript(`${expression}; true;`);
  }, []);

  useEffect(() => {
    windLayerRef.current = windLayerEnabled;
    if (mapReady) inject(`window.SalterraMap.setWindLayer(${JSON.stringify(windLayerEnabled)})`);
  }, [inject, mapReady, windLayerEnabled]);

  useEffect(() => {
    if (mapReady && windLayerEnabled) {
      inject(`window.SalterraMap.setWindForecastOffset(${JSON.stringify(windForecastOffset)})`);
    }
  }, [inject, mapReady, windForecastOffset, windLayerEnabled]);

  const loadSpots = useCallback(async () => {
    if (!supabase || !profile) {
      setLoadError(true);
      setLoadingSpots(false);
      return;
    }
    setLoadingSpots(true);
    const { data, error } = await supabase
      .from('fishing_spots')
      .select('id, name, latitude, longitude')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[Map] Could not load saved fishing spots:', error.code, error.message);
      setLoadError(true);
    }
    else {
      setLoadError(false);
      setSpots(data ?? []);
    }
    setLoadingSpots(false);
  }, [profile]);

  useEffect(() => {
    let current = true;
    if (!supabase || !profile) return () => { current = false; };

    supabase
      .from('fishing_spots')
      .select('id, name, latitude, longitude')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!current) return;
        if (error) console.warn('[Map] Could not load saved fishing spots:', error.code, error.message);
        setLoadError(Boolean(error));
        if (!error) setSpots(data ?? []);
        setLoadingSpots(false);
      });

    return () => { current = false; };
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let subscription: Location.LocationSubscription | null = null;

      async function startLocationTracking() {
        try {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (!focused) return;
          if (permission.status !== 'granted') {
            Alert.alert(
              copyRef.current('Δεν δόθηκε πρόσβαση στην τοποθεσία', 'Location access was not granted'),
              copyRef.current('Για να εμφανίζεται η θέση σου καθώς μετακινείσαι, επίτρεψε την πρόσβαση στην τοποθεσία.', 'Allow location access to see your position update as you move.'),
            );
            return;
          }

          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (!focused) return;
          const initialCoordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          currentLocationRef.current = initialCoordinate;
          setSelectedSpotId(null);
          setSelectedCoordinate(null);
          if (mapReadyRef.current) inject(`window.SalterraMap.flyTo(${JSON.stringify(initialCoordinate)})`);

          const nextSubscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
            nextPosition => {
              if (!focused) return;
              const coordinate = { latitude: nextPosition.coords.latitude, longitude: nextPosition.coords.longitude };
              currentLocationRef.current = coordinate;
              if (mapReadyRef.current) inject(`window.SalterraMap.updateCurrentLocation(${JSON.stringify(coordinate)})`);
            },
            reason => console.warn('[Map] Continuous location updates stopped:', reason),
          );

          if (!focused) nextSubscription.remove();
          else subscription = nextSubscription;
        } catch (error) {
          console.warn('[Map] Could not start continuous location tracking:', error);
          if (focused) {
            Alert.alert(
              copyRef.current('Δεν βρέθηκε η τοποθεσία σου', 'Could not get your location'),
              copyRef.current('Έλεγξε ότι οι Υπηρεσίες τοποθεσίας είναι ενεργές και δοκίμασε ξανά.', 'Check that Location Services are enabled, then try again.'),
            );
          }
        }
      }

      void startLocationTracking();
      return () => {
        focused = false;
        subscription?.remove();
      };
    }, [inject]),
  );

  useEffect(() => {
    if (!mapReady) return;
    inject(`window.SalterraMap.setSpots(${JSON.stringify(asFeatureCollection(spots))})`);
  }, [inject, mapReady, spots]);

  useEffect(() => {
    if (!mapReady) return;
    inject(`window.SalterraMap.setSelected(${JSON.stringify(selectedCoordinate)})`);
  }, [inject, mapReady, selectedCoordinate]);

  useEffect(() => {
    if (!mapReady) return;
    inject(`window.SalterraMap.setSelectedSpot(${JSON.stringify(selectedSpotId)})`);
  }, [inject, mapReady, selectedSpotId]);

  const handleMapMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as MapMessage;
      if (message.type === 'ready') {
        mapReadyRef.current = true;
        setMapReady(true);
        setMapError(false);
        if (currentLocationRef.current) {
          inject(`window.SalterraMap.flyTo(${JSON.stringify(currentLocationRef.current)})`);
        }
      } else if (message.type === 'error') {
        setMapError(true);
      } else if (message.type === 'select') {
        setSelectedSpotId(null);
        setSelectedCoordinate({ latitude: message.latitude, longitude: message.longitude });
        setSaveOpen(false);
        setSpotName('');
        setWindSummary(null);
      } else if (message.type === 'spot') {
        setSelectedCoordinate(null);
        setSelectedSpotId(message.id);
        setSaveOpen(false);
        setSpotName('');
        setWindSummary(null);
      } else if (message.type === 'wind') {
        if (windLayerRef.current) {
          setWindSummary({ speed: message.speed, direction: message.direction, time: message.time, error: Boolean(message.error) });
        }
      }
    } catch {
      setMapError(true);
    }
  }, [inject]);

  function goToCurrentLocation() {
    const coordinate = currentLocationRef.current;
    if (!coordinate) {
      Alert.alert(copy('Η τοποθεσία σου φορτώνει', 'Your location is loading'));
      return;
    }
    setSelectedSpotId(null);
    setSelectedCoordinate(null);
    setSaveOpen(false);
    setSpotName('');
    inject(`window.SalterraMap.centerOnCurrentLocation(${JSON.stringify(coordinate)})`);
  }

  function toggleWindLayer() {
    const enabled = !windLayerEnabled;
    windLayerRef.current = enabled;
    setWindLayerEnabled(enabled);
    setWindForecastOffset(0);
    setWindSummary(null);
  }

  function selectWindForecastOffset(hours: number) {
    setWindForecastOffset(hours);
    setWindSummary(null);
  }

  async function saveFishingSpot() {
    if (saveInProgressRef.current) return;
    const name = spotName.trim();
    if (!selectedCoordinate) {
      Alert.alert(copy('Δεν έχει επιλεγεί σημείο', 'No location selected'));
      return;
    }
    if (!profile || !supabase) {
      Alert.alert(
        copy('Δεν είναι διαθέσιμη η αποθήκευση', 'Saving is unavailable'),
        copy('Έλεγξε ότι είσαι συνδεδεμένος στον λογαριασμό σου και δοκίμασε ξανά.', 'Check that you are signed in to your account, then try again.'),
      );
      return;
    }
    if (!name) {
      Alert.alert(copy('Γράψε ένα όνομα για το σημείο', 'Enter a name for this spot'));
      return;
    }
    saveInProgressRef.current = true;
    setSavingSpot(true);
    try {
      const { data, error } = await supabase
        .from('fishing_spots')
        .insert({
          owner_id: profile.id,
          name,
          latitude: selectedCoordinate.latitude,
          longitude: selectedCoordinate.longitude,
        })
        .select('id, name, latitude, longitude')
        .single();

      if (error || !data) {
        if (error) console.warn('[Map] Could not save fishing spot:', error.code, error.message, error.details, error.hint);
        Alert.alert(
          copy('Δεν αποθηκεύτηκε το σημείο', 'Spot could not be saved'),
          error
            ? `${copy('Η βάση δεδομένων επέστρεψε:', 'Database response:')} ${error.code ?? 'unknown'}\n${error.message}`
            : copy('Δεν επιστράφηκε το αποθηκευμένο σημείο. Δοκίμασε ξανά.', 'The saved spot was not returned. Please try again.'),
        );
        return;
      }

      setSpots(current => [data, ...current]);
      setSelectedSpotId(null);
      setSelectedCoordinate(null);
      setSpotName('');
      setSaveOpen(false);
    } catch (error) {
      console.warn('[Map] Unexpected error while saving fishing spot:', error);
      Alert.alert(
        copy('Δεν αποθηκεύτηκε το σημείο', 'Spot could not be saved'),
        copy('Παρουσιάστηκε σφάλμα σύνδεσης. Δοκίμασε ξανά.', 'A connection error occurred. Please try again.'),
      );
    } finally {
      saveInProgressRef.current = false;
      setSavingSpot(false);
    }
  }

  const coordinateForDetails = selectedSpot ?? selectedCoordinate;

  return (
    <View style={styles.container}>
      <WebView
        ref={mapRef}
        source={{ html: MAP_HTML, baseUrl: 'https://salterra.local' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        onLoadStart={() => { mapReadyRef.current = false; setMapReady(false); }}
        onMessage={handleMapMessage}
        onError={() => setMapError(true)}
        onHttpError={event => {
          if (event.nativeEvent.statusCode >= 400) setMapError(true);
        }}
        style={styles.webView}
      />

      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy('Κεντράρισμα στην τοποθεσία μου', 'Center on my location')}
          onPress={goToCurrentLocation}
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
          <Feather name="crosshair" size={21} color={palette.red} />
        </Pressable>

        {windLayerEnabled ? <View style={styles.windSummaryCard}>
          <View style={styles.windIcon}><Feather name="wind" size={18} color="#a66f17" /></View>
          <View style={styles.windValueGroup}>
            {windSummary?.error ? (
              <Text style={styles.windUnavailable}>{copy('Μη διαθέσιμο', 'Unavailable')}</Text>
            ) : windSummary?.speed != null ? (
              <>
                <Text style={styles.windValue}>{Math.round(windSummary.speed)} <Text style={styles.windUnit}>km/h</Text></Text>
                <Text style={styles.windUpdated}>
                  {windSummary.time ? `${copy('Ενημέρωση', 'Updated')} ${windSummary.time.slice(11, 16)}` : copy('Τώρα', 'Now')}
                </Text>
              </>
            ) : (
              <Text style={styles.windUnavailable}>{copy('Φόρτωση…', 'Loading…')}</Text>
            )}
          </View>
          {windSummary?.speed != null && windSummary.direction != null ? <>
            <View style={styles.windDivider} />
            <View style={styles.windDirectionGroup}>
              <Text style={styles.windDirection}>{compassDirection(windSummary.direction, copy('Ελληνικά', 'English'))}</Text>
              <Text style={styles.windDirectionLabel}>{copy('Κατεύθυνση', 'Direction')}</Text>
            </View>
          </> : null}
        </View> : null}
        {loadingSpots || !mapReady ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={palette.red} />
            <Text style={styles.loadingText}>{copy('Φορτώνει ο χάρτης…', 'Loading the map…')}</Text>
          </View>
        ) : null}

        {loadError ? (
          <Pressable onPress={() => void loadSpots()} style={styles.notice} accessibilityRole="button">
            <Feather name="alert-circle" size={16} color={palette.red} />
            <Text style={styles.noticeText}>{copy('Δεν φορτώθηκαν τα σημεία σου · Πάτησε για επανάληψη', 'Saved spots did not load · Tap to retry')}</Text>
          </Pressable>
        ) : null}

        {mapError ? (
          <View style={styles.errorBanner}>
            <Feather name="wifi-off" size={16} color={palette.red} />
            <Text style={styles.noticeText}>{copy('Ο χάρτης δεν φορτώθηκε. Έλεγξε τη σύνδεσή σου.', 'The map did not load. Check your connection.')}</Text>
          </View>
        ) : null}

        {coordinateForDetails ? (
          <View style={styles.selectionCard}>
            <View style={styles.selectionHeader}>
              <View style={styles.selectionIcon}><Feather name={selectedSpot ? 'bookmark' : 'map-pin'} size={17} color={palette.red} /></View>
              <View style={styles.selectionText}>
                <Text numberOfLines={1} style={styles.selectionTitle}>
                  {selectedSpot?.name ?? copy('Επιλεγμένη τοποθεσία', 'Selected location')}
                </Text>
                <Text style={styles.coordinates}>
                  {coordinateForDetails.latitude.toFixed(5)}, {coordinateForDetails.longitude.toFixed(5)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy('Κλείσιμο', 'Close')}
                hitSlop={10}
                onPress={() => { setSelectedCoordinate(null); setSelectedSpotId(null); setSaveOpen(false); setSpotName(''); }}>
                <Feather name="x" size={20} color={palette.muted} />
              </Pressable>
            </View>
            {selectedCoordinate ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy('Άνοιγμα φόρμας αποθήκευσης σημείου', 'Open save spot form')}
                hitSlop={6}
                onPress={() => setSaveOpen(true)}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                <Feather name="bookmark" size={16} color={palette.white} />
                <Text style={styles.saveButtonText}>{copy('Αποθήκευση ιδιωτικού σημείου', 'Save private fishing spot')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : windLayerEnabled ? (
          <View style={styles.windForecastDock}>
            <ScrollView
              horizontal
              bounces={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.windForecastContent}>
              {WIND_FORECAST_OFFSETS.map(hours => {
                const active = windForecastOffset === hours;
                const label = windForecastLabel(hours, copy('el', 'en') === 'el');
                return (
                  <Pressable
                    key={hours}
                    accessibilityRole="button"
                    accessibilityLabel={`${copy('Άνεμος', 'Wind')} ${label.day} ${label.time}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => selectWindForecastOffset(hours)}
                    style={({ pressed }) => [styles.windForecastOption, active && styles.windForecastOptionActive, pressed && styles.pressed]}>
                    <Text style={[styles.windForecastDay, active && styles.windForecastDayActive]}>{label.day}</Text>
                    <Text style={[styles.windForecastTime, active && styles.windForecastTimeActive]}>{label.time}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View pointerEvents="none" style={styles.hintPill}>
            <Feather name="bookmark" size={13} color={palette.red} />
            <Text style={styles.hintText}>{copy('Κράτησε πατημένο για αποθήκευση σημείου', 'Press and hold to save a spot')}</Text>
          </View>
        )}

        {!coordinateForDetails ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy('Πηγές χάρτη και δεδομένων', 'Map and data sources')}
            hitSlop={8}
            onPress={() => setAttributionOpen(true)}
            style={({ pressed }) => [
              styles.sourcesLink,
              windLayerEnabled ? styles.sourcesLinkWithForecast : styles.sourcesLinkWithHint,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.sourcesText}>{copy('© Πηγές', '© Sources')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.layerTray}>
          <View style={styles.layerHeading}>
            <Text style={styles.layerTitle}>{copy('ΘΑΛΑΣΣΙΑ ΔΕΔΟΜΕΝΑ', 'SEA CONDITIONS')}</Text>
            <Text style={styles.layerHint}>{copy('Επίλεξε επίπεδο', 'Choose a layer')}</Text>
          </View>
          <Animated.ScrollView
            ref={layerScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.layerBarContent}
            onLayout={handleLayerViewportLayout}
            onContentSizeChange={handleLayerContentSizeChange}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: layerScrollX } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            onTouchStart={markLayerInteracted}
            onScrollBeginDrag={markLayerInteracted}>
            <MapLayerButton icon="wind" label={copy('Άνεμος', 'Wind')} active={windLayerEnabled} onPress={toggleWindLayer} />
            <MapLayerButton icon="activity" label={copy('Κυματισμός', 'Waves')} disabled />
            <MapLayerButton icon="thermometer" label={copy('Θερμοκρασία', 'Temperature')} disabled />
            <MapLayerButton icon="navigation" label={copy('Ρεύματα', 'Currents')} disabled />
            <MapLayerButton icon="layers" label={copy('Ανάγλυφο βυθού', 'Seabed relief')} disabled />
            <MapLayerButton icon="shield" label={copy('Προστασία', 'Protected areas')} disabled />
          </Animated.ScrollView>
          {layerHasOverflow ? (
            <View pointerEvents="none" style={styles.layerScrollTrack} onLayout={event => setLayerTrackWidth(event.nativeEvent.layout.width)}>
              <Animated.View style={[styles.layerScrollThumb, {
                width: layerThumbWidth,
                transform: [{ translateX: layerThumbTranslate }],
              }]} />
            </View>
          ) : null}
        </View>
      </View>

      <Modal visible={saveOpen} transparent animationType="fade" onRequestClose={() => { setSaveOpen(false); setSpotName(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            bounces={false}>
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}><Feather name="bookmark" size={20} color={palette.red} /></View>
              <Text style={styles.modalTitle}>{copy('Όνομα για το σημείο', 'Name this spot')}</Text>
              <Text style={styles.modalDescription}>{copy('Το σημείο θα αποθηκευτεί ιδιωτικά στον χάρτη σου.', 'This spot will be saved privately to your map.')}</Text>
              <TextInput
                autoFocus
                value={spotName}
                onChangeText={setSpotName}
                maxLength={100}
                placeholder={copy('π.χ. Λιμανάκι Λεμεσού', 'e.g. Limassol harbour')}
                placeholderTextColor={palette.muted}
                returnKeyType="done"
                onSubmitEditing={() => { if (spotName.trim()) void saveFishingSpot(); }}
                style={styles.nameInput}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => { setSaveOpen(false); setSpotName(''); }} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>{copy('Ακύρωση', 'Cancel')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!spotName.trim() || savingSpot}
                  onPressIn={() => { void saveFishingSpot(); }}
                  style={[styles.confirmButton, (!spotName.trim() || savingSpot) && styles.disabled]}>
                  {savingSpot ? <ActivityIndicator color={palette.white} /> : <Text style={styles.confirmText}>{copy('Αποθήκευση', 'Save')}</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={attributionOpen} transparent animationType="fade" onRequestClose={() => setAttributionOpen(false)}>
        <View style={styles.attributionBackdrop}>
          <View style={styles.attributionCard}>
            <View style={styles.attributionHeading}>
              <View style={styles.attributionTitleGroup}>
                <View style={styles.attributionCardIcon}><Feather name="info" size={18} color={palette.red} /></View>
                <Text style={styles.attributionTitle}>{copy('Πληροφορίες χάρτη', 'Map information')}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy('Κλείσιμο', 'Close')}
                hitSlop={10}
                onPress={() => setAttributionOpen(false)}
                style={styles.attributionClose}>
                <Feather name="x" size={19} color={palette.muted} />
              </Pressable>
            </View>
            <View style={styles.attributionDivider} />
            <Text style={styles.attributionCopy}>OpenFreeMap · OpenMapTiles</Text>
            <Text style={styles.attributionCopy}>Data from OpenStreetMap</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dce8e5' },
  webView: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#dce8e5' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, padding: 14, justifyContent: 'space-between' },
  locationButton: { position: 'absolute', top: 111, right: 14, width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: '#ffffff', shadowColor: '#263d37', shadowOpacity: 0.16, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  windSummaryCard: { position: 'absolute', top: 111, left: 14, width: 214, height: 52, paddingHorizontal: 10, borderRadius: 17, backgroundColor: 'rgba(244, 243, 241, 0.98)', borderWidth: 1, borderColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 7, shadowColor: '#263d37', shadowOpacity: 0.12, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  layerTray: { position: 'absolute', top: 14, left: 14, right: 14, height: 88, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 8, borderRadius: 21, backgroundColor: 'rgba(244, 243, 241, 0.98)', borderWidth: 1, borderColor: '#ffffff', shadowColor: '#263d37', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  layerHeading: { height: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  layerTitle: { color: palette.ink, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  layerHint: { color: palette.muted, fontSize: 8, fontWeight: '500' },
  layerBarContent: { alignItems: 'center', gap: 6, paddingTop: 5, paddingRight: 12 },
  layerScrollTrack: { position: 'absolute', left: 14, right: 14, bottom: 4, height: 3, borderRadius: 2, backgroundColor: '#e2dfdb', overflow: 'hidden' },
  layerScrollThumb: { height: 3, borderRadius: 2, backgroundColor: '#8a2d25' },
  layerButton: { minHeight: 42, paddingHorizontal: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#e8e8e8' },
  layerButtonActive: { backgroundColor: palette.red },
  layerButtonDisabled: { opacity: 0.42 },
  layerButtonText: { color: palette.ink, fontSize: 11, fontWeight: '600' },
  layerButtonTextActive: { color: '#ffffff', fontWeight: '700' },
  windIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3eddd' },
  windValueGroup: { width: 82, justifyContent: 'center' },
  windValue: { color: '#173e35', fontSize: 19, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  windUnit: { fontSize: 10, fontWeight: '700' },
  windUpdated: { color: palette.muted, fontSize: 8, lineHeight: 11, fontWeight: '500' },
  windDivider: { width: 1, height: 27, backgroundColor: '#d8d5d0' },
  windDirectionGroup: { width: 44, alignItems: 'center', justifyContent: 'center' },
  windDirection: { color: '#173e35', fontSize: 14, lineHeight: 16, fontWeight: '800' },
  windDirectionLabel: { color: palette.muted, fontSize: 7, lineHeight: 10, fontWeight: '600' },
  windUnavailable: { flex: 1, color: palette.muted, fontSize: 10, fontWeight: '600' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  loadingCard: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 15, backgroundColor: 'rgba(250, 249, 247, 0.96)' },
  loadingText: { color: palette.ink, fontSize: 12, fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.white, borderRadius: 12, padding: 10 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.white, borderRadius: 12, padding: 10 },
  noticeText: { color: palette.ink, fontSize: 11, flex: 1 },
  selectionCard: { position: 'absolute', left: 14, right: 14, bottom: 8, zIndex: 20, padding: 13, borderRadius: 18, backgroundColor: 'rgba(250, 249, 247, 0.98)', gap: 12, shadowColor: '#263d37', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 20 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectionIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#f4e9e6', alignItems: 'center', justifyContent: 'center' },
  selectionText: { flex: 1, gap: 3 },
  selectionTitle: { color: '#173e35', fontSize: 14, fontWeight: '700' },
  coordinates: { color: palette.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  saveButton: { minHeight: 44, borderRadius: 13, backgroundColor: palette.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonText: { color: palette.white, fontSize: 13, fontWeight: '700' },
  windForecastDock: { position: 'absolute', left: 14, right: 14, bottom: 10, height: 64, padding: 5, borderRadius: 20, backgroundColor: 'rgba(244, 243, 241, 0.97)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', shadowColor: '#263d37', shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  windForecastContent: { alignItems: 'center', gap: 4, paddingRight: 3 },
  windForecastOption: { height: 52, minWidth: 68, paddingHorizontal: 8, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 2 },
  windForecastOptionActive: { backgroundColor: palette.red },
  windForecastDay: { color: '#807b77', fontSize: 7, lineHeight: 10, fontWeight: '800', letterSpacing: 0.35 },
  windForecastDayActive: { color: 'rgba(255,255,255,0.78)' },
  windForecastTime: { color: '#353b39', fontSize: 12, lineHeight: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  windForecastTimeActive: { color: palette.white },
  sourcesLink: { position: 'absolute', right: 8, minHeight: 22, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  sourcesLinkWithForecast: { bottom: 80 },
  sourcesLinkWithHint: { bottom: 21 },
  sourcesText: { color: 'rgba(54, 62, 60, 0.68)', fontSize: 8, fontWeight: '600' },
  hintPill: { position: 'absolute', left: 14, right: 78, bottom: 10, minHeight: 44, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 22, backgroundColor: 'rgba(244, 243, 241, 0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: '#263d37', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  hintText: { color: palette.muted, fontSize: 10, fontWeight: '600', flexShrink: 1 },
  attributionBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 18, paddingBottom: 28, backgroundColor: 'rgba(28,35,33,0.36)' },
  attributionCard: { padding: 17, borderRadius: 20, backgroundColor: palette.white, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', gap: 9, shadowColor: '#263d37', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  attributionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attributionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attributionCardIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4e9e6' },
  attributionTitle: { color: '#173e35', fontSize: 15, fontWeight: '700' },
  attributionClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f0ee' },
  attributionDivider: { height: 1, backgroundColor: '#e8e5e1', marginVertical: 2 },
  attributionCopy: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(28, 35, 33, 0.42)' },
  modalScroll: { flex: 1 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  modalCard: { padding: 20, borderRadius: 22, backgroundColor: palette.white, gap: 12 },
  modalIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#f4e9e6', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#173e35', fontSize: 19, fontWeight: '700' },
  modalDescription: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  nameInput: { minHeight: 48, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: '#dedbd7', color: palette.ink, fontSize: 15, backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 4 },
  cancelButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  cancelText: { color: palette.muted, fontSize: 14, fontWeight: '600' },
  confirmButton: { minWidth: 112, minHeight: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, backgroundColor: palette.red },
  confirmText: { color: palette.white, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
