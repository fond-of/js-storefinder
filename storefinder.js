'use strict';

var $ = require('jquery');

window.jQuery = window.jQuery || $;

var StoreFinder = $.StoreFinder = {};
var self = {},
    markerCluster = null;


Validation.add('required-country', 'Please select a country.', function(v) {
    if ($('#storefinder-filter-form-input-address').val()
        && ( $('#storefinder-filter-form-input-country').val() == 'all'  || $('#storefinder-filter-form-input-country').val() == '' )
    ){
        return false;
    }

    return true;
});

// init plugin
$.StoreFinder.init = function (options) {

    self = $.extend({
        //google maps settings
        scrollwheel: false,
        latitude: 52.51966798345114,
        longitude: 13.40306282043457,
        mapCanvas: 'storefinder-map',
        zoomLevel: 3,
        zoomControl: true,
        disableDefaultUI: true,
        searchButton: $('.storefinder-form button'),
        searchResultBlock: $('.storefinder .search-list'),
        radiusSelect: $('#storefinder-radius'),
        searchForm: $('#storefinder-filter-form'),
        urlSearch: window.location.origin + '/de/' + 'storefinder/ajax/search/',
        markers: '',
        markerIcon: '',
        showInfoWindow : true,
        minZoom: 3,
        maxZoom: 16,
        layout: '',
        markerTextColor: '#ffffff',

        onInit: function () {

            var mapCanvas = $('#' + self.mapCanvas),
                latitude = mapCanvas.data('latitude'),
                longitude = mapCanvas.data('longitude'),
                zoomLevel = mapCanvas.data('zoomlevel'),
                showInfoWindow = mapCanvas.data('showinfowindow');

            if (latitude){
                self.latitude = latitude;
            }

            if (longitude){
                self.longitude = longitude;
            }

            if (zoomLevel){
                self.zoomLevel = zoomLevel;
            }

            if (typeof showInfoWindow !== 'undefined'){
                self.showInfoWindow = showInfoWindow;
            }

            var map = initGM();
            var markers = getMarkers();

            setMarker(map, markers);

        }


    }, options || {});

    self.onInit();
};

/**
 * init google map
 *
 * @param mapsJson
 * @param $
 */
var initGM = function (data) {

    var currentRadius = self.radiusSelect.val();
    switch (currentRadius) {
        case '10' :
            self.zoomLevel = 14;
            break;
        case '20' :
            self.zoomLevel = 12;
            break;
        case '50' :
            self.zoomLevel = 8;
            break;
        case '100' :
            self.zoomLevel = 7;
            break;
        case '200' :
            self.zoomLevel = 6;
            break;
        default:
            self.zoomLevel = self.zoomLevel;
    }
    var options = {
        styles: self.layout,
        scrollwheel: false,
        zoom: self.zoomLevel,
        scrollWheel: self.scrollWheel,
        zoomControl: self.zoomControl,
        mapTypeControl: self.mapTypeControl,
        disableDefaultUI: self.disableDefaultUI,
        center: new google.maps.LatLng(self.latitude, self.longitude),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        minZoom : self.minZoom,
        maxZoom : self.maxZoom
    };

    // build map
    var map = new google.maps.Map(document.getElementById(self.mapCanvas), options);
    setMarker(map, data);

    return map;
};


/**
 * Retrieve Markers
 */
var getMarkers = function () {

    var parameters = [];

    if (self.searchForm !== null) {
        parameters = self.searchForm.serialize();
    }

    var mapCanvas = $('#' + self.mapCanvas);
    self.urlSearch = mapCanvas.data('ajaxurl');

    if (mapCanvas.data('storeid')){
        if (parameters){
            parameters = '&id=' + mapCanvas.data('storeid');
        }else{
            parameters = 'id=' + mapCanvas.data('storeid');
        }
    }

    // send post action on submit
    $.post(self.urlSearch, parameters, function (response) {
        if (response.state === 'success'){
            initGM(response.data);
        }

    }, 'json');
};

var setMarker = function(map, data){
    var bounds = new google.maps.LatLngBounds(),
        infoWindow = [],
        mapCanvas = $('#' + self.mapCanvas);

    if (mapCanvas.data('zoomlevel')){
        self.zoomLevel = mapCanvas.data('zoomlevel');
    }

    var zoomChangeBoundsListener =
        google.maps.event.addListener(map, 'bounds_changed', function () {
            google.maps.event.removeListener(zoomChangeBoundsListener);
            map.setZoom(self.zoomLevel);
        });


    var markerIconsUrl = self.markerIcon = mapCanvas.data('markericonurl'),
        mcOptions = {
            styles: [
                {
                    width: 52,
                    height: 53,
                    textColor: self.markerTextColor,
                    url: markerIconsUrl + '/m1.png'
                }
            ],
            maxZoom: 12,
            gridSize: 20
        },
        clusterMarkers = [];

    // set marker for each JSON item
    if (data){
        $.each(data.items, function (index) {
            if (this.longitude !== '0' && this.latitude !== '0'){
                var markerLatLng = new google.maps.LatLng(this.latitude, this.longitude);
                bounds.extend(markerLatLng);

                var icon = new google.maps.MarkerImage(markerIconsUrl + '/marker.png', null, null, null, null);

                var marker = new google.maps.Marker({
                    position: markerLatLng,
                    map: map,
                    animation: google.maps.Animation.DROP,
                    icon: icon
                });

                clusterMarkers.push(marker);

                infoWindow[index] = new google.maps.InfoWindow({
                    content: this.content
                });

                // add event listener to marker
                if (self.showInfoWindow){
                    google.maps.event.addListener(marker, 'click', function () {
                        closeInfoWindows(infoWindow);
                        infoWindow[index].open(map, this);
                    });
                }

                map.fitBounds(bounds);
                map.panToBounds(bounds);

            }
        });
    }

    var markerCluster = new MarkerClusterer(map, clusterMarkers, mcOptions);
};

/**
 * close info windows
 *
 * @param infoWindow
 */
var closeInfoWindows = function (infoWindow) {
    for (var i = 0; i < infoWindow.length; i++) {
        infoWindow[i].close();
    }
};

var init = function (options) {

    $(document).ready(function () {

        StoreFinder.init(options);


        if( $('#storefinder-map').length ){
            var form = document.getElementById("storefinder-filter-form");

            if (form){
                var dataForm = new VarienForm('storefinder-filter-form', true);
                form.addEventListener("submit", function (e) {
                    e.preventDefault();

                    if(dataForm.validator && dataForm.validator.validate()){
                        var actionUrl = $(this).attr('action'),
                            urlParams = getUrlParams();

                        if (urlParams.length){
                            actionUrl = actionUrl + '?' + urlParams.join('&');
                        }

                        $(this).attr('action', actionUrl);
                        $(this).submit();

                    }
                });
            }
        }

        $('.address-contact-buttons > a').on( "click", function(e) {
            var value = $(this).data('value');

            if (value){
                e.preventDefault();
                $('.address-contact-items .item').each(function(index, item){
                    if ($(item).hasClass(value)){
                        if (!$(item).hasClass('active')){
                            $(item).addClass('active');
                        }else{
                            $(item).removeClass('active');
                        }
                    }else if($(item).hasClass('active')) {
                        $(item).removeClass('active');
                    }
                });

            }else{
                $('.address-contact-items .item.active').removeClass('active');
            }
        });

    });

    /**
     * Retrieve Url Params
     *
     * @return string
     */
    function getUrlParams(){
        var urlParams = new Array();

        if ($('#storefinder-filter-form-input-country').val()){
            var country = $('#storefinder-filter-form-input-country').val();
            urlParams.push('country=' + encodeURIComponent(country));
        }

        if ($('#storefinder-filter-form-input-address').val()){
            var address = $('#storefinder-filter-form-input-address').val();
            urlParams.push('address=' + encodeURIComponent(address));
        }

        return urlParams;
    }

};

exports.init = init;