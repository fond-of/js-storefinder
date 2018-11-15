'use strict';

const $ = require('jquery');
const MarkerClusterer = require('node-js-marker-clusterer');

/**
 * @param {Array} storefinderCustomOptions
 * @param {String} apiKey
 */
function init(storefinderCustomOptions, apiKey)
{
    toggleContactAddressInfoboxOnDetailPage();

    let apiUrl = '//maps.googleapis.com/maps/api/js?v=3&key=' + apiKey;

    $.getScript(apiUrl, function()
    {
        let storefinderOptions = getStorefinderOptions(storefinderCustomOptions);
        let mapOptions = getMapOptions(storefinderOptions);

        let map = initializeMap(storefinderOptions, mapOptions);
        let markerClusterOptions = getMarkerClusterOptions(storefinderOptions);
        let markerCluster = initializeMarkerCluster(map, markerClusterOptions);

        if (typeof getStorefinderMapContainer(storefinderOptions).data('latitude') === 'undefined') {
            initializeMarkers(map, markerCluster, storefinderOptions);
        } else {
            let data = [{
                'latitude' : storefinderOptions.latitude,
                'longitude' : storefinderOptions.longitude,
                'content' : '',
            }];

            let markers = createMarkers(map, data, storefinderOptions);

            markerCluster.clearMarkers();
            markerCluster.addMarkers(markers, false);
        }
    });
}

/**
 * @returns void
 */
function toggleContactAddressInfoboxOnDetailPage()
{
    $('.address-contact-buttons > a').on('click', function(e) {
        var value = $(this).data('value');

        if (value) {
            e.preventDefault();
            $('.address-contact-items .item').each(function(index, item) {
                let itemJquery = $(item);

                if (itemJquery.hasClass(value)){
                    if (!itemJquery.hasClass('active')) {
                        itemJquery.addClass('active');
                    } else {
                        itemJquery.removeClass('active');
                    }
                } else if(itemJquery.hasClass('active')) {
                    itemJquery.removeClass('active');
                }
            });
        } else {
            $('.address-contact-items .item.active').removeClass('active');
        }
    });
}

/**
 * @param {Object} map
 * @param {Object} markerCluster
 * @param {String} storefinderOptions
 */
function initializeMarkers(map, markerCluster, storefinderOptions)
{
    $.getJSON(getCurrentSearchQuery(storefinderOptions), function(data)
    {
        let markers = createMarkers(map, data, storefinderOptions);

        markerCluster.clearMarkers();
        markerCluster.addMarkers(markers, false);
    });
}

/**
 * @param {Object} map
 * @param {String} storefinderOptions
 */
function setMapZoomLevel(map, storefinderOptions)
{
    let zoomChangeBoundsListener = google.maps.event.addListener(map, 'bounds_changed', function () {
        google.maps.event.removeListener(zoomChangeBoundsListener);
        map.setZoom(storefinderOptions.zoomLevel);
    });
}

/**
 * @param {Object} map
 * @param {Array} data
 * @param {String} storefinderOptions
 * @returns {Array}
 */
function createMarkers(map, data, storefinderOptions)
{
    let markers = [];
    let bounds = new google.maps.LatLngBounds();
    let infoWindows = [];

    $.each(data, function(index)
    {
        let item = this;
        let latitude = item.latitude;
        let longitude = item.longitude;
        let popoverContent = item.content || '';

        if (latitude === '0' || longitude === '0') {
            return true;
        }

        let markerLatLng = new google.maps.LatLng(latitude, longitude);
        bounds.extend(markerLatLng);

        let icon = new google.maps.MarkerImage(storefinderOptions.markerMapsIconUrl, null, null, null, null);
        let marker = new google.maps.Marker({
            position: markerLatLng,
            map: map,
            animation: google.maps.Animation.DROP,
            icon: icon
        });

        markers.push(marker);

        // create marker popup
        if (storefinderOptions.showInfoWindow && popoverContent != '') {
            infoWindows[index] = new google.maps.InfoWindow({
                content: popoverContent
            });

            // add event listener to marker
            google.maps.event.addListener(marker, 'click', function () {
                closeInfoWindows(infoWindows);
                infoWindows[index].open(map, this);
            });
        }

        map.fitBounds(bounds);
        map.panToBounds(bounds);
    });

    return markers;
}

/**
 * @param {Array} infoWindows
 */
function closeInfoWindows(infoWindows) {
    for (var i = 0; i < infoWindows.length; i++) {
        infoWindows[i].close();
    }
}

/**
 * @param {Object} map
 * @param {Array} markerClusterOptions
 */
function initializeMarkerCluster(map, markerClusterOptions)
{
    return new MarkerClusterer(map, [], markerClusterOptions);
}

/**
 * @param {Array} storefinderOptions
 * @returns {Array}
 */
function getMarkerClusterOptions(storefinderOptions)
{
    return {
        styles: [
            {
                width: 52,
                height: 53,
                textColor: storefinderOptions.markerTextColor,
                url: storefinderOptions.markerIconUrl
            }
        ],
        maxZoom: 12,
        gridSize: 20
    }
}

/**
 * @param {String} storefinderOptions
 * @returns {Array}
 */
function getCurrentSearchQuery(storefinderOptions)
{
    let searchQuery = storefinderOptions.urlSearch;

    let params = (new URL(document.location)).searchParams;
    if (params.has('country')) {
        searchQuery += '&country=' + params.get('country');
    }

    if (params.has('address')) {
        searchQuery += '&address=' + params.get('address');
    }

    searchQuery += '&lang=' + $('html').prop('lang');

    // replace first match of &
    searchQuery = searchQuery.replace('&', '?');

    return searchQuery;
}

/**
 * @param {Array} storefinderCustomOptions
 * @returns {Array}
 */
function getStorefinderOptions(storefinderCustomOptions)
{
    let storefinderDefaultOptions = getStorefinderDefaultOptions();
    let storefinderOptions = $.extend(storefinderDefaultOptions, storefinderCustomOptions || {});

    let storefinderMapContainer = getStorefinderMapContainer(storefinderOptions);

    return $.extend(storefinderOptions, getStorefinderDataOptions(storefinderMapContainer) || {});
}

/**
 * @param {Object} storefinderMapContainer
 * @returns {Array}
 */
function getStorefinderDataOptions(storefinderMapContainer)
{
    let storefinderMapContainerDataOptions = {};

    let latitude = storefinderMapContainer.data('latitude');
    let longitude = storefinderMapContainer.data('longitude');
    let zoomLevel = storefinderMapContainer.data('zoomlevel');
    let searchUrl = storefinderMapContainer.data('search-url');

    if (latitude) {
        storefinderMapContainerDataOptions.latitude = latitude;
    }

    if (longitude) {
        storefinderMapContainerDataOptions.longitude = longitude;
    }

    if (zoomLevel) {
        storefinderMapContainerDataOptions.zoomLevel = zoomLevel;
    }

    if (searchUrl) {
        storefinderMapContainerDataOptions.urlSearch = searchUrl;
    }

    return storefinderMapContainerDataOptions;
}

/**
 * @param {Array} storefinderOptions
 * @returns {Object}
 */
function getStorefinderMapContainer(storefinderOptions)
{
    return $('#' + storefinderOptions.mapCanvas);
}

/**
 * @returns {Array}
 */
function getStorefinderDefaultOptions()
{
    return {
        scrollWheel: false,
        latitude: 52.51966798345114,
        longitude: 13.40306282043457,
        mapCanvas: 'storefinder-map',
        zoomLevel: 3,
        zoomControl: true,
        disableDefaultUI: true,
        searchForm: $('#storefinder-filter-form'),
        urlSearch: window.location.origin + '/de/storefinder/search',
        markers: '',
        markerIcon: '',
        showInfoWindow : true,
        minZoom: 3,
        maxZoom: 16,
        layout: '',
        markerTextColor: '#ffffff',
        markerIconUrl: window.location.origin + '/assets/affenzahn/images/m1.png',
        markerMapsIconUrl: window.location.origin + '/assets/affenzahn/images/marker.png',
    }
}

/**
 * @param {Array} storefinderOptions
 * @returns {Array}
 */
function getMapOptions(storefinderOptions)
{
    return {
        styles: storefinderOptions.layout,
        scrollwheel: false,
        zoom: storefinderOptions.zoomLevel,
        scrollWheel: storefinderOptions.scrollWheel,
        zoomControl: storefinderOptions.zoomControl,
        mapTypeControl: storefinderOptions.mapTypeControl,
        disableDefaultUI: storefinderOptions.disableDefaultUI,
        center: new google.maps.LatLng(storefinderOptions.latitude, storefinderOptions.longitude),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        minZoom : storefinderOptions.minZoom,
        maxZoom : storefinderOptions.maxZoom
    };
}

/**
 * @param {Array} storefinderOptions
 * @param {Array} googleMapsOptions
 *
 * @return google.maps.Map
 */
function initializeMap(storefinderOptions, googleMapsOptions)
{
    let container = document.getElementById(storefinderOptions.mapCanvas);

    return new google.maps.Map(container, googleMapsOptions);
}

exports.init = init;
