var Fiver = {
  firstView: false,
  notRouteSearch : false,
  displayClass: {
    setting: '.content-fiver--start',
    list:    '.content-fiver--list',
    spot:    '.content-fiver--spot',
    listMap: '.content-fiver--list-map',
    spotMap: '.content-fiver--spot-map',
  },

  targetMapId: {
    list: '#__map-list',
    spot: '#__map-spot',
  },

  spotStorageKey: 'addSpotLists',
  getgeoUrl: 'https://lodosaka.heteml.jp/lodosaka.jp/afterfiver/osaka/getgeo.html',
  listItemDom: $('.content-fiver--list .m-list'),
  startLocationDom: $('#current-location-start__textarea'),
  destLocationDom: $('#current-location-dest__textarea'),

  rooturl: 'http://afterfiver.lodosaka.jp/',  //add20161218

  // option
  drawItemNum: 5000,
  listNum: 10,

  defaultAjaxOption: {
    cache:    true,
    //crossDomain: true,
    type:     'GET',
    url:      '',
    dataType: 'json',
    data:     {},
    timeout: 10000,
  },

  listForDefaultSpot: [
    {address: "Osaka Station",     latlng: '34.702485,135.495951'},
    {address: "Kansai International Airport",latlng: '34.427222,135.243889'},
    {address: "Osaka International Airport(Itami Airport)", latlng: '34.791486,135.440457'},
  ],

  logEvent: {
    tab:    'mainpageShow',
    search: 'search',
    list:   'listShow',
    detail: 'detailShow',
    recipe: 'recipeSelect',
    vod:    'vodSelect',
    map:    'MapShow',
    mapAppStart: 'MapStart',
    mapAppDest: 'MapDest',
    weblink: 'websiteSelect'
  },

  // for google
  googleMapLink: 'http://maps.google.co.jp/maps?',
  googleCustomsearchApi: 'https://www.googleapis.com/customsearch/v1?',
  googleGeocodeApi: 'https://maps.google.com/maps/api/geocode/json?',
  googleApiKey: {
    serverId: 'AIzaSyD_0b44Bf1darDmqSrRD6N0pr3dCwzlYPc',
    engineId: '********'
  },

  googleMapIcon: {
    start: 'assets/img/map_start.png',
    dest:  'assets/img/map_dest.png',
    target: 'assets/img/map_point.png',
    point: 'assets/img/map_point_gray.png',
  },

  googleMapOptions: {
    zoom: 14,
    center: new google.maps.LatLng(34.702485,135.495951),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    disableDefaultUI: true,
  },

  googleDirectionOption: {
    travelMode:        google.maps.DirectionsTravelMode.DRIVING,
    unitSystem:        google.maps.DirectionsUnitSystem.METRIC,
    optimizeWaypoints: true, // 経由地点最適化の有無
    avoidHighways:     false,
    avoidTolls:        false,
  },

  infoWindow: new google.maps.InfoWindow(),
  directionsService: new google.maps.DirectionsService(),
  directionsDisplay: null,
  map: null,
  markers: [],

  // for local data
  defaultSettingData: {
    plan: '',
    mode: 'drive', // drive, walk, bicycle
    start: {
      location: '',
      geo: {lat: 0, lng: 0},
    },
    dest: {
      location: '',
      time: '',
      geo: {lat: 0, lng: 0},
    },
  },

  settingData: null,
  lodData: null,
  lodDataOrigne: null,
  lodDataItemsTemp: [],
  selectedSpotData: null,
  spotImageData: null,
  spotRecipeData: null,
  spotVideoData: null,
  currentDisplayDom: null,
  currentAddress: null,
  routeCountup: 0,
  listForSpotData: [],
  sortedData: [],

  // $.ready、メニュータブ選択時に呼び出し
  init: function() {
    var self = this;

    self.sendLog(self.logEvent.tab);

    // 初回のみ実行
    if (!this.firstView) {
      this.firstView = true;
      this.bindAction();
      this.initLocation();
//      this.setPulldownForSpots();
    }
    this.setPulldownForSpots(); //add20161218
    this.showSettingDisplay();
  },

  initLocation: function() {
    var self = this;
    var type = 'start,dest'.split(',');

    // latlngを元に住所を検索
    var fetchAddress = function(latlng, type) {
      self.fetchGoogleGeoodeApi(latlng, 'latlng')
        .done(function(data) {
          setAddress(data.address, type);
        })
        .fail(function(data){
          alert("Address was not found");
          self.error();
        });
    };

    // 要素に住所を代入
    var setAddress = function(address, type){
      //visibleCurrentLocatoin(type, true);

      $.cookie(self.retCookieNameForAddress(type), address);
      self.setCurrentAddress(type, address);
    };
    // 要素の表示切り替え
    var visibleCurrentLocatoin = function(type, bool) {
      var target = '';
      switch(type) {
        case 'start':
          target = '#current-location-start__div'
          break;
        case 'dest':
          target = '#current-location-dest__div';
          break;
      }

      if (bool) {
        $(target).show();
      } else {
        $(target).hide();
      }
    };

    // Cookie情報を元に、検索、表示処理
    for (var i = 0; i < type.length; i++) {
      var curType = type[i];
      if (this.isGeolocationApi()) {
        var curAddr   = this.retAddressFromCookie(curType);
        var curLatlng = this.retLatlngFromCookie(curType);

        // 現在地の住所情報がCoogieに無ければ取得。緯度経度情報も無ければ枠を非表示
        if (curAddr) {
          setAddress(curAddr, curType);
        } else if (curLatlng) {
          fetchAddress(curLatlng, curType);
        } else {
          //visibleCurrentLocatoin(curType, false);
        }
      } else {
        // geolocationが使用できないため、現在地ボタンを非表示
        //visibleCurrentLocatoin(curType, false);
      }
    }
  },
  setCurrentAddress: function(type, address) {
    switch(type) {
      case 'start':
        this.startLocationDom.text(address);
        this.startLocationDom.val(address);
        break;
      case 'dest':
        this.destLocationDom.text(address);
        this.destLocationDom.val(address);
        break;
    }
  },

  //========================================================
  // display
  //========================================================
  switchDisplayDom: function(targetName, noScroll) {
    var self = this;
    _.each(this.displayClass, function(key) {
      var target = $(key);
      if (key == targetName) {
        target.show();
        if(!noScroll) {
          target.find('.content-body__scroll').scrollTop(0);
        }
        self.currentDisplayDom = target;
      } else {
        target.hide();
      }
    });
  },
  showSettingDisplay: function() {
    $(this.displayClass.list + ' .m-list').html('');
    this.switchDisplayDom(this.displayClass.setting);
  },
  showListDisplay: function() {
    this.loader(false);

    this.offListItemAction();
    this.onListItemAction();
    this.switchDisplayDom(this.displayClass.list, true);

    var spots = [];
    var items = this.retLodItems();
    for (var i = 0; i < items.length; i++) {
      spots.push(items[i].place);
    }
    this.sendLog(this.logEvent.list, {
      spot: spots.join(','),
    });
  },
  updateListDisplay: function() {
    this.loader(false);
    this.setHtmlListDom();
    this.offListItemAction();
    this.onListItemAction();

    // visible more button
    if (this.routeCountup < this.sortedData.length) {
      $('.spot-list-more').show();
    } else {
      $('.spot-list-more').hide();
    }
  },

  showSpotDisplay: function() {
    var self = Fiver;
    var spotData = this.retSelectedSpotData();
    //console.log("show Spot",spotData);
    var visibleTgt = function(tgt, item) {
      if(item && item.length) {
        tgt.show();
      } else {
        tgt.hide();
      }
    };

    var display = function() {
      self.loader(false);
      self.setHtmlSpotDescription();
      self.switchDisplayDom(self.displayClass.spot);
      self.onSpotItemAction();

      //項目の表示制御
      visibleTgt($('#spot-search-image'), self.retSpotImageItems());
      visibleTgt($('#spot-related'), self.retSpotVideoItems());
      visibleTgt($('#spot-recipe'), self.spotRecipeData);
      visibleTgt($('#spot-comment'), spotData.comment);

      self.sendLog(self.logEvent.detail, {
        spot: spotData.place,
        keyword: self.settingData.plan,
        recipes: self.retDataItemIdList($('#spot-recipe-list a')),
        VOD: self.retDataItemIdList($('#spot-related-video-list a')),
      });
    };

    this.loader(true);
    this.resetHtmlSpotDom();

    this.setInterviewContent();

    // 全ての通信が終わったら画面表示
 /*   self.setHtmlSpotImageFromKeyword(spotData.name_ja).then(
        self.setHtmlSpotVideoFromKeyword(),
        self.setHtmlSpotVideoFromKeyword()
    ).then(
        self.setHtmlSpotRecipeFromKeyword(),
        self.setHtmlSpotRecipeFromKeyword()
    ).then(function() {
      display();
    }, function() {*/
      display();
    //});
  },

  // 撮影用の機能「能福寺」のコンテンツ詳細で表示
  setInterviewContent: function() {
    var dfd = $.Deferred();
    var self = Fiver;
    var placeId = 'h379';
    var vodKeyword  = [
      ['V2007263'],
      'V2007239,V2007258'.split(',')
   ];
   var dbpApiTgtList = '#spot-templ-api,#spot-buddhism-api'.split(',');

    var tgtDbpArr = '#spot-temple-dbp,#spot-buddis-dbp'.split(',');
    var tgtVodArr = '#spot-temple-list,#spot-buddis-list'.split(',');
    var tgtDiv = $('#spot-interview-content');

    var spotData = self.retSelectedSpotData();
    if (spotData.place.search(placeId) < 0){
      tgtDiv.hide();
      return;
    }
    tgtDiv.show();

    var ended = function(){
      dfd.resolve();
    };


    var fetchData = function(dbpApiTgt, vodArr, tgtDbp, tgtVod, i) {
      var dfd = $.Deferred();
      var cnt = 0;
      var finished = function(){
        cnt++;
        if (cnt == 2) {
          dfd.resolve();
        }
      }
      // DBpedia
      self.fetchDbpedia(dbpApiTgt).then(
        function(data) {
          var str = '';
          if(data.results.bindings && data.results.bindings.length) {
            str = data.results.bindings[0].abstract.value.substring();
          }

          $(tgtDbp).html('<p>' + str + '</p>');
          finished();
        },function(data) {
        });

      // VOD
      self.fetchNhkVod('clip', vodArr).then(
        function(data) {
          var items = data.results.bindings;
          var html = '';
          for (var i = 0; i < items.length; i++) {
            html += self.makeSpotVideoItemHtml(items[i]);
          }
          $(tgtVod).html(html);
          finished();
        },function(data) {
        });
      return dfd.promise();
    };

    fetchData(dbpApiTgtList[0], vodKeyword[0], tgtDbpArr[0], tgtVodArr[0], 1).then(function(){
        fetchData(dbpApiTgtList[1], vodKeyword[1], tgtDbpArr[1], tgtVodArr[1] ,2)
      }).then(function(){
        ended();
      });

    return dfd.promise();
  },

  fetchDbpedia: function(tgtId) {
    var self = Fiver;
    var dfd = $.Deferred();
    var tgt = $(tgtId);
    self.fetchAjax({
        url: tgt.attr('action'),
        data: tgt.serialize()
      },
      function(data) {
        dfd.resolve(data);
      },
      function(data) {
        dfd.reject(data);
      });
    return dfd.promise();
  },

  fetchNhkVod: function(filterName, searchList) {
    var self = Fiver;
    var dfd = $.Deferred();
    var tgt = $('#spot-temple-vod-api');
    var query = tgt.serialize()
    var replaceKey = 'REPLACEKEYWORD';

    var retContains = function(key, str) {
      return 'CONTAINS(STR(?' + key + '),"' + str + '")';
    };
    var retFilterStr = function(key, str) {
      return 'Filter(STR(?' + key + '),"' + str + '").'
    };

    var filterWord = [];
    if (searchList) {
      for (var i = 0; i < searchList.length; i++) {
        filterWord.push(retContains(filterName, searchList[i]));
      }
      filterWord = filterWord.join(' || ');
    }
    query = query.replace(replaceKey, filterWord);

    self.fetchAjax({
        url: tgt.attr('action'),
        data: query
      },
      function(data) {
        dfd.resolve(data);
      },
      function(data) {
        dfd.reject(data);
      });
    return dfd.promise();
  },

  showListMapDisplay: function() {
    this.switchDisplayDom(this.displayClass.listMap);

    // リストの１番目の情報をセットしてマップ画面へ
    var set = this.setListMap(0);
    if (set) {$('#list-map-desc').show();}
    else {$('#list-map-desc').hide();}
  },
  showSpotMapDisplay: function() {
    this.switchDisplayDom(this.displayClass.spotMap);
    this.renderSpotMap();
    this.sendShowMapLog();
  },
  setListMap: function(no) {
    var data = this.retLodDataFromNumber(no);
    var ret = false;
    if (data) {
      this.setSelectedSpotData(data.id);
      this.setHtmlListMapInfo(no);
      this.renderListMap();
      ret = true;
    }
    this.sendShowMapLog();
    return ret;
  },

  //=========================
  // for GoogleMap
  //=========================
  renderListMap: function() {
    var self = this;
    this.initializeMap('list');
    this.renderDirectionMap().done(function(){
      self.setMapMarkerFromLodItems();
    });
  },
  renderSpotMap: function() {
    var self = this;
    this.initializeMap('spot');
    this.renderDirectionMap();
  },

  renderDirectionMap: function() {
    var self = this;
    var dfd = $.Deferred();

    // ルート検索の初期化
    this.directionsDisplay = new google.maps.DirectionsRenderer({
       "map": this.map,
       "preserveViewport": true,
       "suppressMarkers" : true
    });
    var spot = this.retSelectedSpotData();
    var start = new google.maps.LatLng(self.settingData.start.geo.lat, self.settingData.start.geo.lng);
    var dest = new google.maps.LatLng(self.settingData.dest.geo.lat, self.settingData.dest.geo.lng);
    var waypoint = new google.maps.LatLng(spot.lat, spot.long);

    this.searchRouteFromGoogmeDirection(
      start,
      dest,
      waypoint,
      this.settingData.mode
    ).done(function(response, status) {
      self.directionsDisplay.setDirections(response);
      self.setMapMarkerFromSpot();
      self.setMapMarkerFromStartAndDest();
      dfd.resolve(response);
    }).fail(function(response, status) {
      dfd.reject(response, status);
    });
    return dfd.promise();
  },

  initializeMap: function(type) {
    var start = this.settingData.start;
    var end   = this.settingData.dest;
    var spot  = this.retSelectedSpotData();
    var address =  spot.address;
    var target = '';

    this.deleteAllMarker();
    this.map = null;
    this.directionsDisplay = null;

    switch(type) {
      case 'list':
        target = this.targetMapId.list;
        break;
      case 'spot':
        target = this.targetMapId.spot;
        break;
    }

    // スタートの緯度経度をセンターに設定する
    var latlng = this.listForDefaultSpot[0].latlng.split(',');
    if (start.geo.lat && start.geo.lng) {
      latlng = [start.geo.lat, start.geo.lng];
    }
    this.googleMapOptions.center = new google.maps.LatLng(latlng[0], latlng[1]);
    this.map = new google.maps.Map($(target).get(0), this.googleMapOptions);
  },

  //引数の配列から中間地点データを作成し返却
  makeWaypointData: function(waypoints) {
    var points = [];
    for (var i = 0; i < waypoints.length; i++) {
      points[i] = {
        location: waypoints[i],
        stopover: true
      };
    }
    return points;
  },

  setMapMarkerFromSpot: function() {
    var spot = this.retSelectedSpotData();
    var latlng = new google.maps.LatLng(spot.lat, spot.long);
    this.addMarker(latlng, spot.name , 'target');
  },
  setMapMarkerFromStartAndDest: function() {
    var latlng = null;
    var start = this.settingData.start;
    var dest = this.settingData.dest;

    // 開始、目的値が同じ緯度経度の場合は、開始位置に加算
    if (start.lat == dest.lat &&
        start.lng == dest.lng) {
      var addLatlng = this.addLatlngForMeter(start.geo.lat, start.geo.lng, 2);
      latlng = new google.maps.LatLng(addLatlng.lat, addLatlng.lng);
    } else {
      latlng = new google.maps.LatLng(start.geo.lat, start.geo.lng);
    }
    this.addMarker(latlng, start.location , 'start');

    latlng = new google.maps.LatLng(dest.geo.lat, dest.geo.lng);
    this.addMarker(latlng, dest.location , 'dest');
  },
  setMapMarkerFromLodItems: function() {
    var items = this.retLodItems();
    var spot = this.retSelectedSpotData();
    var latlng = null;

    for (var i = 0; i < items.length; i++) {
      if (items[i] && items[i].lat && items[i].long) {
        latlng = new google.maps.LatLng(items[i].lat, items[i].long);

        if (spot.lat == items[i].lat && spot.long == items[i].long) {
          this.addMarker(latlng, items[i].name, 'target');
        } else {
          this.addMarker(latlng, items[i].name);
        }
      }
    }

    this.setMapMarkerFromStartAndDest();
  },
  addLatlngForMeter: function(lat, lng, m) {
    // 緯度経度において、0.0001で約１0m
    var meter = 0.0001;
    var addMeter = m ? meter * m : meter;

    return {
      lat: Number(lat) + addMeter,
      lng: Number(lng) + addMeter
    };
  },

  addMarker: function(latlng, name, type) {
    var self = this;
    var iconSizeDef = [32, 32];
    var iconOffset     = new google.maps.Point(iconSizeDef[0], iconSizeDef[1]);
    var iconPosition   = new google.maps.Point(0, 0);
    var iconSize       = new google.maps.Size(iconSizeDef[0], iconSizeDef[1]);
    var icon = null;

    var markerImage = function(image) {
      return new google.maps.MarkerImage(image,  iconSize, iconPosition, iconOffset);
    }

    switch (type){
      case 'start':
        icon = markerImage(this.googleMapIcon.start);
        break;
      case 'dest':
        icon = markerImage(this.googleMapIcon.dest);
        break;
      case 'target':
        icon = markerImage(this.googleMapIcon.target);
        break;
      default:
        // point
        icon = markerImage(this.googleMapIcon.point);
        break;
    }

    var marker = new google.maps.Marker({
      map: this.map,
      position: latlng,
      icon: icon,
      title: name
    });

    // add event handler
    google.maps.event.addListener(marker, 'click', function() {
      var html = "<b>" + name + "</b> <br/>" ;
      self.infoWindow.setContent(html);
      self.infoWindow.open(this.map,marker);
    });

    // add marker
    this.markers.push(marker);
  },

  // マップの初期化
  initMap: function() {
    this.deleteAllMarker();
  },
  // マーカー削除
  deleteAllMarker: function() {
    for (var i = 0; i < this.markers.length; i++) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
  },

  // ルート検索
  searchRouteFromGoogmeDirection: function(start, dest, waypoint, mode) {
    var self = this;
    var dfd = $.Deferred();

    //経由地をもとにGoogleAPIで問い合わせて、MAPへ描画

    var request = {
      origin:      start,
      destination: dest
    };

    request = $.extend({}, request, self.googleDirectionOption);

    switch(mode) {
      case 'walk':
        request.travelMode = google.maps.DirectionsTravelMode.WALKING;
        break;
      case 'bicycle':
        request.travelMode = google.maps.DirectionsTravelMode.BICYCLING;
        break;
      default:
        request.travelMode = google.maps.DirectionsTravelMode.DRIVING;
        break;
    }

    // 選択中のSpotを経由地に設定
    if (waypoint) {
      request.waypoints = this.makeWaypointData([waypoint]);
    }

    this.directionsService.route(
      request,
      function(response, status) {
        if (status == google.maps.DirectionsStatus.OK){
          dfd.resolve(response, status);
        } else {
          dfd.reject(response, status);
        }
      });
    return dfd.promise();
  },

  //========================================================
  // event
  //========================================================
  bindAction: function() {
    var self = this;

    // clicked for searchButton
    $('.m-ui-button--search').on('click', function() {
      $('#m-list-sort').val('');
      self.setSettingData(self.makeSearchSettingData());

      // 検索ログ送信
      self.sendLog(self.logEvent.search, {
        start: self.settingData.start.location,
        destination: self.settingData.dest.location,
        duration: self.settingData.dest.time,
        plan: self.settingData.plan,
      });

      self.loader(true);

      self.fetchSearchLOD()
      .done(function(data) {
        var format = self.formatLodData(data);
        if (format.total_num) {
          //add20161218 検索件数を表示する
          $('#spot-search-count').text(format.total_num);

          self.setSearchLodReult(format);
          // フォーマットデータを元にソートする
          self.setSortedLodData();

          // ルート検索
          self.addDurationAndDistanceFromLodData();
        } else {
          // 検索結果は0件です
          alert('There is no result');
          self.error();
        }
      })
      .fail(function(error) {
        alert("LOD GET ERROR:" + error);
        self.error();
      });
    });


    // clicked for backButton
    $(this.displayClass.list + ' .__link-back').on('click', function() {
      self.showSettingDisplay();
    });
    $(this.displayClass.spot + ' .__link-back').on('click', function() {
      self.showListDisplay();
    });
    $('#m-button--list').on('click', function() {
      self.showListDisplay();
    });
    $('#m-button--spot').on('click', function() {
      self.showSpotDisplay();
    });

    // clicked for mapButton
    $(this.displayClass.spot + ' .__link-map').on('click', function() {
      self.showSpotMapDisplay();
    });
    $(this.displayClass.list + ' .__link-map').on('click', function() {
      self.showListMapDisplay();
    });

    // clicked list map arrow
    $('#list-map-desc__prev').on('click', function() {
      self.setListMap($(this).data('list-map-prev'));
    });
    $('#list-map-desc__next').on('click', function() {
      self.setListMap($(this).data('list-map-next'));
    });

    // swipe for map list
    var swipeElem = document.getElementById("list-map-desc-item");
    var swipeObj = new Hammer(swipeElem);
    swipeObj.on("swipeleft", function(event) {
      self.setListMap($('#list-map-desc__prev').data('list-map-prev'));
    });
    swipeObj.on("swiperight", function(event) {
      self.setListMap($('#list-map-desc__next').data('list-map-next'));
    });

    // change sort
    $('#m-list-sort').change(function() {
      var sort = $(this).val();

      self.setSortedLodData(sort);
      $('.spot-list-more').hide();
      self.loader(true);
      $(self.displayClass.list + ' .m-list').html('');
      $(self.displayClass.list).find('.content-body__scroll').scrollTop(0);
      self.addDurationAndDistanceFromLodData();
    });

    // clicked Add to List
    $('.m-button--favorite').on('click', function() {
      var textarea = $(this).parents('div._layout3').find('textarea');
      var type = 'start';
      if (textarea.attr('id').search('dest') > -1) {
        type = 'dest';
      }

      if (textarea.val() == '') {
        // 出発地又は目的地の住所を入力してください
        alert('Please enter the address of the place of departure or destination');
        return;
      }
      self.addToList(type, textarea.val());
    });

    // click current location(latlng) link
    $('.link-current-latlng').on('click', function(){
      var type = '';
      type = ($(this).attr('id').search('start') > -1) ? 'start' : 'dest';

      switch(type) {
        case 'start':
          self.removeCookieFromStart();
          break;
        case 'dest':
          self.removeCookieFromDest();
          break;
      }

      location.href = self.getgeoUrl + '?type=' + type;
    });

    // click for list map description
    $('.__spot-desc__item').on('click', function(){
      self.showSpotDisplay();
    });


    // view in map app for modal
    var mapModal = window.mapModal = new Modal('.__fiver-map-modal');
    $('.m-button--map-app').on('click', function(){
      var links = self.retLinkOfMapAppBttonLinks();

      mapModal.show();

      // start to waypoint
      mapModal.$content.find('a').eq(0).attr({
        'href': links[0],
        'id':   'js_map_start'
      });
      // waypoint to start
      mapModal.$content.find('a').eq(1).attr({
        'href': links[1],
        'id':   'js_map_dest'
      });
      return false;
    });

    // click spot web site
    $('#spot-web a').on('click', function(){
      var spotData = self.retSelectedSpotData();

      self.sendLog(self.logEvent.weblink, {
        spot: spotData.place,
        keyword: self.settingData.plan,
        link: $(this).attr('href'),
        recipes: self.retDataItemIdList($('#spot-recipe-list a')),
        VOD: self.retDataItemIdList($('#spot-related-video-list a')),
      });
    });

    $('.map-app-modal-link').on('click', function(){
      var event = self.logEvent.mapAppStart;

      if ($(this).attr('id').search('dest') > -1) {
        event = self.logEvent.mapAppDest;
      }

      self.sendMapAppLog(event);
    });

    $('.spot-list-more').on('click', function(){
      self.loader(true);

      if (self.routeCountup < self.sortedData.length) {
        self.retRoutCalDataSortedData();
      } else {
        $('.spot-list-more').hide();
      }
    });

/*
    // unload action
    $(window).on('beforeunload', function() {
      self.removeCookieFromLocation();
    });
*/
  },
  onListItemAction: function() {
    var self = this;
    $('.m-list__item', this.listItemDom).on('click', function() {
      self.setSelectedSpotData($(this).data('af-item-id'));
      self.showSpotDisplay();
    });
  },
  offListItemAction: function() {
    $('.m-list__item', this.listItemDom).off('click');
  },

  // click for spot recipe and video
  onSpotItemAction: function() {
    var self = this;
    var tgtDom = $('#spot-recipe-list a, #spot-related-video-list a');

    tgtDom.off('click');
    tgtDom.on('click', function(){
      var id = $(this).data('spot-item-id');
      var spotData = self.retSelectedSpotData();
      var param = {
        keyword: spotData.nhkWorldKey
      };
      var event = self.logEvent.vod;

      if ($(this).attr('class').search('recipe') > -1) {
        event = self.logEvent.recipe;
        param.recipe = id;
      } else {
        param.VOD = id;
      }

      self.sendLog(event, param);
    });
  },

  // ルート検索完了
  routeSearchEnd: function() {
  //console.info("routeSearchEnd", this.lodData, this.sortedData,this.lodDataOrigne.total_num);
  //console.info("sortedData", this.sortedData,this.lodDataOrigne.total_num);
  //console.info("lodData", this.lodData);

    if (this.lodDataItemsTemp.length) {
      this.updateListDisplay();
      this.showListDisplay();
    } else {
      alert('There is no result');
      this.error();
    }
  },

  sendShowMapLog: function() {
    var spotData = this.retSelectedSpotData();
    this.sendLog(this.logEvent.map, {
      spot: spotData.place
    });
  },

  sendMapAppLog: function(event) {
    var spotData = this.retSelectedSpotData();
    this.sendLog(event, {
      spot: spotData.place
    });
  },

  error: function(str) {
    this.loader(false);
  },

  //========================================================
  // fetch API
  //========================================================
  fetchAjax: function(param ,onComplate ,onError) {
    var data = $.extend({}, this.defaultAjaxOption, param);
    $.ajax(data)
    .done(onComplate)
    .fail(onError);
  },

  // LODからプランに関する情報を取得
  fetchSearchLOD: function() {
    var dfd = $.Deferred();
    this.fetchAjax(
      {
        url: $('#spot-lod-api').attr('action'),
        data: $('#spot-lod-api').serialize().replace('PLANWORD', this.settingData.plan),
      },
      function(data) {
        dfd.resolve(data);
      },
      function(data) {
        dfd.reject(data);
      });
    return dfd.promise();
  },
/*  fetchGoogleImgFromKeyword: function(keyword) {
    var self = Fiver;
    var dfd = $.Deferred();
    var query = {
      key:   self.googleApiKey.serverId,
      cx:    self.googleApiKey.engineId,
      q:     keyword,
      count: 9,
      start: 1,
      hl:    'ja',
      imgSize:    'medium',
      imgType:    'photo',
      searchType: 'image',
    };*/

/*    self.fetchAjax({url: self.googleCustomsearchApi + $.param(query)},
      function(data) {
        if (data.items && data.items.length) {
          dfd.resolve(data);
        } else {
          dfd.reject(data);
        }
      },
      function(data) {
        dfd.reject(data);
      });
    return dfd.promise();
  },*/
  fetchRelatedRecipeFromKeyword: function(keyword) {
    var self = Fiver;
    var dfd = $.Deferred();
    var filterWord = self.retContainesQueryForRecipe(keyword);
    var query = $('#spot-recipe-api').serialize();

    // keywordがなければリクエストしない
    if (!keyword) {
      return dfd.reject();
    }

    filterWord = 'FILTER(' + filterWord + ').';
    query = query.replace('REPLACEFILTER', filterWord);

    self.fetchAjax({
        url: $('#spot-recipe-api').attr('action'),
        data: query
      },
      function(data) {
        dfd.resolve(data);
      },
      function(data) {
        dfd.reject(data);
      });
    return dfd.promise();
  },

  fetchRelatedVideoFromKeyword: function(vod, vod_sc) {
    var self = Fiver;
    var dfd = $.Deferred();
    var query = $('#spot-video-api').serialize()
    var setContains = function(str) {
      return 'CONTAINS(?clip,"' + str + '")';
    };
    var setFilter = function(key, str) {
      return 'Filter(STR(?' + key + ')="' + str + '").'
    };

    var filterWord = '';
    if (vod) {
      filterWord = setFilter('id', vod);
    }
    query = query.replace('ReplaceFilterId', filterWord);


    filterWord = '';
    if (vod_sc) {
      vod_sc = vod_sc.replace('<', '');
      vod_sc = vod_sc.replace('>', '');
      filterWord = setFilter('scene', vod_sc);
      //FILTER(STR(?scene)="http://nw-lod.nhk.or.jp/V2007261_s356").
    }
    query = query.replace('ReplaceFilterScene', filterWord);
    console.log("fetchRelatedVideoFromKeyword",vod,vod_sc);

    if (!vod && !vod_sc) {
      return dfd.reject();
    }

    self.fetchAjax({
        url: $('#spot-video-api').attr('action'),
        data: query
      },
      function(data) {
        dfd.resolve(data);
      },
      function(data) {
        dfd.reject(data);
      });
    return dfd.promise();
  },

  fetchGoogleGeoodeApi: function(param, type) {
    var dfd = $.Deferred();
    var query = {
      key:   this.googleApiKey.serverId,
      language: 'en',
//      components: 'country:jp',
//      location_type: 'ROOFTOP',
//      result_type: 'street_address'
    };

    if (type == 'address') {
      query.address = param;
    } else {
      query.latlng = param;
    }

    // for google geocode api
    this.fetchAjax({url: this.googleGeocodeApi + $.param(query)},
      function(data) {
        if (data.status == 'OK' &&
            data.results[0].formatted_address
        ) {
          dfd.resolve({
            address: data.results[0].formatted_address,
            lat: data.results[0].geometry.location.lat,
            lng: data.results[0].geometry.location.lng,
            data: data
          });
        } else {
          dfd.reject(null);
        }
      },
      function(data) {
        dfd.reject(null);
      });
    return dfd.promise();
  },

  // LODデータに時間を追加
  addDurationAndDistanceFromLodData: function() {
    // LODデータをそのまま表示
    if (this.notRouteSearch) {
      this.routeSearchEnd();
      return;
    }

    this.routeCountup = 0;
    this.lodDataItemsTemp = [];
    this.retRoutCalDataSortedData();
  },

  retRouteCalLineAndTime: function(spotData) {
    //開始点と目的地の緯度経度
    var lat_s  = this.settingData.start.geo.lat;
    var long_s = this.settingData.start.geo.lng;
    var lat_d  = this.settingData.dest.geo.lat;
    var long_d = this.settingData.dest.geo.lng;
    var defaultSpeed = [5 ,40];//徒歩, 車 の速度km/h
    var lat  = spotData.lat;
    var long = spotData.long;

    if (!lat || !long) {
      return null;
    }

    //日本における１Km辺りの経度
    var km = 0.010966404715491394;

    // 開始地点と終了地点が同じ場合は、10mプラスして計算
    if (lat_s == lat_d &&
        long_s == long_d) {
        var addLatlng = this.addLatlngForMeter(lat_s, long_s);
        lat_d = addLatlng.lat;
        long_d = addLatlng.lng;
    }

    //直線の傾けと切片の計算
    var m = (long_d - long_s) / (lat_d - lat_s);
    var n = ((long_s * lat_d) - (lat_s * long_d)) / (lat_d - lat_s);

    //観光地と開始位置の直線距離計算
    var distance_s = Math.sqrt((lat - lat_s)*(lat - lat_s) +( long - long_s) * (long - long_s)) / km;
    //観光地と目的地の直線距離計算
    var distance_d = Math.sqrt((lat - lat_d) * (lat - lat_d) + (long - long_d)*(long - long_d)) / km;

    //観光地と、開始位置と目的地を結んだ線との直線距離計算
    var distance = distance_s + distance_d;

    switch (this.settingData.mode) {
      case 'walk':
        speed = defaultSpeed[0];
        break;
      case 'drive':
        speed = defaultSpeed[1];
        break;
    }

    distance = (distance * 1000).toFixed(0);
    var duration = distance / (speed * 1000);
    if (spotData.stay_time) {
      var stayTime = (spotData.stay_time / 60).toFixed(1);
      duration = Number(duration) + Number(stayTime);
    }

//    console.log(spotData);
//    console.log("３箇所の直線距離=", distance, " 時間：", duration);
//    console.log("開始-観光地の直線距離=",distance_s);
//    console.log("観光地-目的地の直線距離=",distance_d);

    var ret = {
      distance: distance / 1000,
      duration: duration
    };

    return ret;
  },


  retRoutCalDataSortedData: function(curPage) {
    var self = this;
    var sortedData = this.sortedData;
    var len = sortedData.length;
    var end   = this.routeCountup + this.listNum;
    if (end > len) {
      end = len;
    }
    this.lodDataItemsTemp = [];

    var next = function() {
      if (self.routeCountup >= end) {
        searchEnd();
      } else {
        self.routeCountup++;
        setTimeout(function(){
          recursivRouteSearch();
         }, 300);
      }
    };

    var searchEnd = function() {
      self.routeSearchEnd();
    };
    var recursivRouteSearch = function() {
      // LODデータ全て検索したら次の処理
      if (self.routeCountup >= end) {
        searchEnd();
      } else {
        var curLodItem = sortedData[self.routeCountup];
        var start      = new google.maps.LatLng(self.settingData.start.geo.lat, self.settingData.start.geo.lng);
        var dest       = new google.maps.LatLng(self.settingData.dest.geo.lat, self.settingData.dest.geo.lng);
        var waypoint   = new google.maps.LatLng(curLodItem.lat, curLodItem.long);
        var mode       = self.settingData.mode;

        self.searchRouteFromGoogmeDirection(start, dest, waypoint, mode)
          .done(function(response, status) {
            //console.log("result", self.routeCountup, response);

            if (response.routes[0]) {
              var dur = Number(response.routes[0].legs[0].duration.value) + Number(response.routes[0].legs[1].duration.value);
              dur += Number(sortedData[Fiver.routeCountup].stay_time) * 60;
              dur = (Number(dur)  / 3600).toFixed(1);
              var dis = Number(response.routes[0].legs[0].distance.value) + Number(response.routes[0].legs[1].distance.value);
              dis = (Number(dis) / 1000).toFixed(1);

              curLodItem.duration = dur;
              curLodItem.distance = dis;

              // 制限時間を比較して範囲外なら除外
              if (parseFloat(dur) <= parseFloat(self.settingData.dest.time)) {
                self.lodDataItemsTemp.push(curLodItem);
              } else {
                //console.log("out time" , dur , self.settingData.dest.time);
              }
            }
            next();
          })
          .fail(function(response, status){
            console.error("route fail", self.routeCountup,response, status);
            next();
          });
      }
    };

    recursivRouteSearch();
  },

  //========================================================
  // data
  //========================================================
  makeSearchSettingData: function() {
    var obj = $.extend({}, this.defaultSettingData);
    var start = 'select[name="startSpotList"] ';
    var dest = 'select[name="destSpotList"] ';
    var startLatlng = $(start + 'option:selected').data('pulldown-latlng').split(',');
    var destLatlng = $(dest + 'option:selected').data('pulldown-latlng').split(',');

    obj.plan = $('select[name="plan"]').val();
    obj.mode = $('input[name="routeMode"]:checked').val();

    obj.start.location = $(start).val();
    obj.start.geo.lat = startLatlng[0];
    obj.start.geo.lng = startLatlng[1];
    obj.dest.location = $(dest).val();
    obj.dest.geo.lat = destLatlng[0];
    obj.dest.geo.lng = destLatlng[1];
    obj.dest.time = ($('select[name="destArriveBy"]').val() / 60).toFixed(1);
    return obj;
  },
  retChoosePlan: function() {
    return this.settingData.plan ? this.settingData.plan : null;
  },
  retLodItems: function() {
    return this.lodData.items || null;
  },
  retLodItemsAtPage: function() {
    return this.lodDataItemsTemp || null;
  },
  retLodItemsOrigne: function() {
    return this.lodDataOrigne.items ? this.lodDataOrigne.items : null;
  },
  retSpotImageItems: function() {
    return this.spotImageData ? this.spotImageData.items : null;
  },
  retSpotVideoItems: function() {
    return this.spotVideoData ? this.spotVideoData.results.bindings : null;
  },
  retSelectedSpotData: function() {
    return this.selectedSpotData ? this.selectedSpotData : null;
  },
  retSelectedSpotLocations: function() {
    var data = this.retSelectedSpotData();
    return {
      lat: data.lat,
      lon: data.long,
      address: data.address
    };
  },
  retLodDataFromNumber: function(num) {
    var items = this.retLodItems();
    if (items && num < items.length) {
      return items[num++];
    }
    return null;
  },

  retCookieNameForAddress: function(type) {
    return this.retCookieNameForLocation(type, 'address');
  },
  retCookieNameForLatlng: function(type) {
    return this.retCookieNameForLocation(type, 'latlng');
  },
  retCookieNameForLocation: function(type, ctg) {
    var key = '';

    switch(type) {
      case 'start':
        key = 's';
        break;
      case 'dest':
        key = 'd';
        break;
    }

    switch(ctg) {
      case 'address':
        key += '_address';
        break;
      case 'latlng':
        key += '_latlng';
        break;
    }

    return key;
  },
  retLatlngFromCookie: function(type) {
    var cookie = $.cookie(this.retCookieNameForLocation(type, 'latlng'));
    if(cookie) {
      return cookie;
    }
    return null;
  },
  retAddressFromCookie: function(type) {
    var cookie = $.cookie(this.retCookieNameForLocation(type, 'address'));
    if(cookie) {
      return cookie;
    }
    return null;
  },
  setSettingData: function(data) {
    this.settingData = $.extend({}, data);
  },
  setSearchLodReult: function(data) {
    this.lodDataOrigne = $.extend({}, data);
    this.resetLodData();
  },
  resetLodData: function(data) {
    this.setLodData(this.lodDataOrigne);
  },
  setLodData: function(data) {
    this.lodData = $.extend({}, data);
  },
  setSortedLodData: function(sort) {
    var sortItems = [];
    this.curPage = 1;
    this.routeCountup = 0;

    $.extend(sortItems, this.retLodItemsOrigne());

    if (sort) {
      // 昇順ソート
      sortItems.sort(function(a, b) {
        a[sort] = parseFloat(a[sort]);
        b[sort] = parseFloat(b[sort]);

        if( a[sort] < b[sort]) return -1;
        if( a[sort] > b[sort] ) return 1;
        return 0;
      });
    }

    this.sortedData = $.extend([], sortItems);
    this.lodData.items = $.extend([], sortItems);
  },
  setSelectedSpotData: function(id) {
    this.selectedSpotData = null;
    var items = this.retLodItems();
    if (items) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id == id) {
          this.selectedSpotData = $.extend(true, {}, items[i]);
          break;
        }
      }
    }
  },

  removeCookieFromLocation: function() {
    this.removeCookieFromStart();
    this.removeCookieFromDest();
  },
  removeCookieFromStart: function() {
    $.removeCookie('s_latlng');
    $.removeCookie('s_address');
  },
  removeCookieFromDest: function() {
    $.removeCookie('d_latlng');
    $.removeCookie('d_address');
  },

  addToList: function(type, address) {
    var self = this;
    var setPulldownAndStrage = function(address, latlng) {
      var isAdd = self.addSpotLists(address, latlng);
      if (isAdd) {
        self.setPulldownForSpots();
      }
    };

    // 新しい住所を入力
    if (this.retAddressFromCookie(type) != address) {
      // addressからLatlng取得
      this.fetchGoogleGeoodeApi(address, 'address')
        .done(function(data) {
          var latlng = data.lat + ',' + data.lng;

          // cookie、テキストエリア、LocalStorageの上書き
          $.cookie(self.retCookieNameForAddress(type), data.address);
          $.cookie(self.retCookieNameForLatlng(type), latlng);
          self.setCurrentAddress(type, data.address);
          setPulldownAndStrage(data.address, latlng);
        })
        .fail(function(data) {
          // 住所が見つかりませんでした
          alert('Address was not found');
        });
    } else {
      // 引数がCookie値と同じ場合は緯度経度情報が有り。LocalStorageを更新
      setPulldownAndStrage(address, self.retLatlngFromCookie(type));
    }
  },

  // LocalStorageに保存。重複は保存しません。
  addSpotLists: function(address, latlng) {
    var limit = 10;
    var lists = this.getStorageForSpots();
    if (address && latlng) {
      if (lists.length >= limit) {
        lists.pop();
        // 古いアドレスを削除し、登録. 上限はN件です
        alert('registered to delete the old address. The limit is ' + limit);
      }

      for (var i = 0; i < lists.length; i++) {
        if (lists[i].latlng == latlng || lists[i].address == address) {
          return true;
        }
      }

      lists.unshift({address: address, latlng: latlng});
      this.listForSpotData = lists;
      this.localStorage.set(this.spotStorageKey, JSON.stringify(lists));
      return true;
    }
    return false;
  },
  getStorageForSpots: function() {
    var storage = this.localStorage.get(this.spotStorageKey);
    if (storage) {
      return JSON.parse(storage);
    }
    return [];
  },
  removeStorageForSpots: function() {
    this.localStorage.remove(this.spotStorageKey);
  },

  isSpotInRange: function(lat, long) {
if (!lat || !long) {
  return false;
}

    //開始点と目的地の緯度経度
    var lat_s  = this.settingData.start.geo.lat;
    var long_s = this.settingData.start.geo.lng;
    var lat_d  = this.settingData.dest.geo.lat;
    var long_d = this.settingData.dest.geo.lng;

    //日本における１Km辺りの経度
    var km = 0.010966404715491394;

    // 開始地点と終了地点が同じ場合は、10mプラスして計算
    if (lat_s == lat_d &&
        long_s == long_d) {
        var addLatlng = this.addLatlngForMeter(lat_s, long_s);
        lat_d = addLatlng.lat;
        long_d = addLatlng.lng;
    }

    //直線の傾けと切片の計算
    var m = (long_d - long_s) / (lat_d - lat_s);
    var n = ((long_s * lat_d) - (lat_s * long_d)) / (lat_d - lat_s);

    //観光地と、開始位置と目的地を結んだ線との直線距離計算
    var distance = (Math.abs(long - m * lat - n))/(Math.sqrt(1 + m * m)) / km;

    //観光地と開始位置の直線距離計算
    var distance_s = Math.sqrt((lat - lat_s)*(lat - lat_s) +( long - long_s) * (long - long_s)) / km;
    //観光地と目的地の直線距離計算
    var distance_d = Math.sqrt((lat - lat_d) * (lat - lat_d) + (long - long_d)*(long - long_d)) / km;

//    console.log("３箇所の直線距離=",distance);
//    console.log("開始-観光地の直線距離=",distance_s);
//    console.log("観光地-目的地の直線距離=",distance_d);
    //観観光地と、開始位置と目的地を結んだ線との直線距離が7km未満の場合
    //かつ、観観光地と開始位置が5km未満もしくは、観観光地と目的地が5km未満の場合にルート検索
    if (distance < 7 && (distance_s < 5 || distance_d  < 5)) {
      return true;
    }
    return false;
  },

  formatLodData: function(data) {
    var names = [];
    var len = 0;
    var cnt = 0;
    var formatData = {
      total_num: 0,
      items: [],
    };
    var convertNameToKey = {
      'name'         : 'name',
      'address'      : 'address',
      'comment'      : 'comment',
      'img_url'      : 'imageURL',
      'fee'          : 'average_price',
      'openingHours' : 'openingHours',
      'keyword'      : 'nhkWorldKey',
      'stay_time'    : 'stay_time',
      'place_lat'    : 'lat',
      'place_long'   : 'long',
      'category'     : 'category',
      'place'        : 'place',
      'name_ja'      : 'name_ja',
      'vod'          : 'vod',
      'vod_sc'       : 'vod_sc',
      'web'          : 'web',
    };

    var removeQuotation = function(str) {
      if (str) {
        str = str.replace(/^"/, '');
        str = str.replace(/"$/, '');
      }
      return str;
    };
    var convertItemData = function(value) {
      var key = '';
      var str = '';
      var item = {
        duration: 0,
        distance: 0
      };
      for (var i = 0; i < names.length; i++) {
        key = convertNameToKey[names[i]];
        str = removeQuotation(value[i]);

        if (key == 'stay_time') {
          item[key] = str || 0;
        } else if (key == 'web'){
          if (str) {
            str = str.replace('<', '');
            str = str.replace('>', '');
          }
          item[key] = str;
        } else {
          if(!str){str = '';}
          if(str == 0){str = '';}

          item[key] = str;
        }
      }

      return item;
    };

    if (data.names && data.values) {
      names = data.names;
      formatData.total_num = len;
    }

    for (var i = 0; i < data.values.length; i++) {
      convert = convertItemData(data.values[i]);
       // 出発、目的地の距離で制限をかける
      if (this.isSpotInRange(convert.lat, convert.long)) {
        // データ件数が多い場合にリミット
        if(cnt >= this.drawItemNum) {break;}

        // 簡易的に距離、時間を計算
        var calData = this.retRouteCalLineAndTime(convert);
        if (calData.duration > Number(this.settingData.dest.time)) {
          continue;
        }
        convert.distance = calData.distance;
        convert.duration = calData.duration;
        formatData.items[cnt] = convert;
        formatData.items[cnt].id = cnt + 1;
        cnt++;
      }
    }

    formatData.total_num = formatData.items.length;
    return formatData;
  },

  setHtmlSpotRecipeFromKeyword: function() {
    var self = Fiver;
    var dfd = $.Deferred();
    var spotData = self.retSelectedSpotData();
    self.spotRecipeData = null;
    console.log("setHtmlSpotRecipeFromKeyword",spotData);

    //keyword が無ければ、categoryの文字列を使用
    var keyword = spotData.nhkWorldKey;
    console.log("recipe keyword",keyword);
    //keyword = "たこ焼き"

    self.fetchRelatedRecipeFromKeyword(keyword)
      .done(function(data) {
        if (data.results.bindings.length) {
          self.spotRecipeData = self.formatRecipeData(data);
          self.setHtmlSpotRecipeDom();
          dfd.resolve();
          $('#spot-recipe').show();
        } else {
          dfd.reject();
        }
      })
      .fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },

  formatRecipeData: function(data) {
    var recipeLimit = 5;
    var nutritionLimit = 10;
    var cnt = 0;
    var nutritionCnt = 0;
    var items = data.results.bindings;
    var curRecipeId = '';
    var oldRecipeId = items[0]? items[0].Recipe.value : '';
    var recipeData = [];
    var showed_url_list = [];
    showed_url_list.push(items[0].r_url.value);

    var makeObj = function(recipe) {
      var getRecipeId = function(val) {
        var id = '';
        if (val && val.split('#')) {
          id = val.split('#')[1];
        }
        return id;
      };
      var ret = {
        recipeId: getRecipeId(recipe.Recipe.value),
        r_title: recipe.r_title.value,
        r_url: recipe.r_url.value,
        r_thumbnail: recipe.r_thumbnail.value,
        r_difficulty: recipe.r_difficulty.value,
        r_IngredientName: [],
        r_nutrition_value: recipe.r_nutrition_value.value
      }
      return ret;
    };

    if (!data && oldRecipeId == '') return recipeData;

    for (var i = 0; i < items.length; i++) {
      curRecipeId = items[i].Recipe.value;

      // レシピデータ作成
      if (!recipeData[cnt]) {
        recipeData[cnt] = makeObj(items[i]);
      }

      // recipeIdが変わるまで食材を追加
      if (curRecipeId != oldRecipeId) {
        // すでに表示しているレシピなら次へ
        if(showed_url_list.indexOf(items[i].r_url.value) >= 0) {
          continue;
        }

        oldRecipeId = curRecipeId;
        showed_url_list.push(items[i].r_url.value);

        // 食材がリミット以上あれば「…」を追加
        if (nutritionCnt > recipeData[cnt].r_IngredientName.length) {
          recipeData[cnt].r_IngredientName.push('…');
        }

        nutritionCnt = 0;
        cnt++;

        if (cnt > recipeLimit) {
          break;
        } else {
          continue;
        }

      } else {
        // 食材の個数はリミットあり
        if (nutritionCnt < nutritionLimit) {
          recipeData[cnt].r_IngredientName.push(items[i].r_IngredientName.value);
        }
        nutritionCnt++;
      }
    }

    return recipeData;
  },

  retDataItemIdList: function(target) {
    var list = [];
    target.each(function(){
      list.push($(this).data('spot-item-id'));
    });
    return list.join(',');
  },

  retContainesQueryForRecipe: function(keyword) {
    if (keyword) {
      var filters = [
          'CONTAINS(?IngredientName,"' + keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase() + '")',
          'CONTAINS(?IngredientName,"' + keyword.toUpperCase() + '")',
          'CONTAINS(?IngredientName,"' + keyword.toLowerCase() + '")',
//        'CONTAINS(?IngredientName_ja,"' + keyword + '")',
//        'CONTAINS(?title_ja,"' + keyword + '")'

      ].join(' || ');
      return filters;
    }
    return '';
  },

  //========================================================
  // HTML
  //========================================================
  makeItemDomStr: function(items, makeHtmlFunc, limit) {
    var html = '';
    if (items) {
      for (var i = 0; i < items.length; i++) {
        html += makeHtmlFunc(items[i]);
        if (i >= limit - 1) break;
      }
    }
    return html;
  },

  // list
  setHtmlListDom: function() {
    $(this.displayClass.list + ' .m-list').append(
      this.makeItemDomStr(
        this.retLodItemsAtPage(),
        this.makeListItemtHtml,
        this.listNum
      ));
  },

  makeListItemtHtml: function(itemData) {
    var html = '<a class="m-list__item" href="#" data-af-item-id="[[ID]]" data-af-item-locatioin="[[LOCATION]]"><div class="__item-head"><h2>[[NAME]]</h2><span class="__category">[[CATEGORY]]</span></div><div class="__item-body"><div class="__thumb"><div class="__thumb-image" style="background-image:url([[LOGO]])"></div></div><div class="__summary"><div><h3>Duration</h3><div>[[DURATION]] hours</div></div><div><h3>Distance</h3><div>[[DISTANCE]] km</div></div>[[STAY_HTML]][[PRICE_HTML]]</div></div></a>';
    html = html.replace('[[CATEGORY]]', itemData.category);
    html = html.replace('[[ID]]',       itemData.id);
    html = html.replace('[[NAME]]',     itemData.name);
    html = html.replace('[[LOGO]]',     itemData.imageURL);
    html = html.replace('[[DURATION]]', itemData.duration);
    html = html.replace('[[DISTANCE]]', itemData.distance);

    // staytime
    var stayHtml = '<div><h3>Stay Time</h3><div>[[STAY]] mins</div></div>';
    if (itemData.stay_time) {
      stayHtml = stayHtml.replace('[[STAY]]', itemData.stay_time);
    } else {
      stayHtml = '';
    }
    html = html.replace('[[STAY_HTML]]',  stayHtml);

    // price
    var priceHtml = '<div><h3>Average price</h3><div style="width:10em;">[[PRICE]]</div></div>';
    if (itemData.average_price) {
      priceHtml = priceHtml.replace('[[PRICE]]', itemData.average_price);
    } else {
      priceHtml = '';
    }
    html = html.replace('[[PRICE_HTML]]', priceHtml);

    html = html.replace('[[LOCATION]]', itemData.address);
    return html;
  },

  // spot description
  setHtmlSpotDescription: function() {
    var spotData = Fiver.retSelectedSpotData();
    var setView = function(tgt, value, suffix) {
      var str = suffix || '';
      if (value == 0 ||
          value == '') {
        tgt.parent().hide();
      } else {
        tgt.parent().show();
        tgt.html(value + str);
      }
    };

    $('#spot-image').html('<div class="__thumb"><div class="__thumb-image" style="background-image:url(' + spotData.imageURL + ');"></div></div>');
    $('#spot-title').html(spotData.name);
    $('#spot-plan').html(spotData.category);
    $('#spot-duration').html(spotData.duration + ' hours');
    $('#spot-distance').html(spotData.distance + ' km');
    setView($('#spot-time'), spotData.stay_time, ' mins');
    setView($('#spot-average-price'), spotData.average_price);
    $('#spot-comment-desc').html(spotData.comment);
    if (spotData.web) {
      $('#spot-web').show();
      $('#spot-web a').attr({'href': spotData.web}).text('・' + spotData.web);
    } else {
      $('#spot-web').hide();
    }

  },

  // spot reset description
  resetHtmlSpotDom: function() {
    $('#spot-image').html('');
    $('#spot-title').html('');
    $('#spot-plan').html('');
    $('#spot-duration').html('');
    $('#spot-distance').html('');
    $('#spot-time').html('');
    $('#spot-average-price').html('');
    $('#spot-comment-desc').html('');
    $('#spot_image-search').html('');
    $('#spot-related-video-list').html('');
    $('#spot-recipe-list').html('');
  },

  // spot images
  setHtmlSpotImageFromKeyword: function(keyword) {
    var self = Fiver;
    var dfd = $.Deferred();
    this.spotImageData = null;

    var addDQ = function(str) {
      return '"' + str + '"';
    };

    if (!keyword) {
      return dfd.reject().promise();
    }

    self.fetchGoogleImgFromKeyword(keyword)
      .done(function(data) {
        self.spotImageData = data;
        self.setHtmlSpotImageDom();
        dfd.resolve();
      })
      .fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },

  setHtmlSpotImageDom: function() {
    $('#spot_image-search').html(
      this.makeItemDomStr(
        this.retSpotImageItems(),
        this.makeSpotImageItemHtml,
        5
      ));
  },
  makeSpotImageItemHtml: function(itemData) {
    var html = '<a href="[[LINK]]"><div class="__thumb-image" style="background-image:url([[IMG]])"></div></a>';
    html = html.replace('[[LINK]]', '#');
    html = html.replace('[[IMG]]',  itemData.image.thumbnailLink);
    return html;
  },

  // spot Recipe
  setHtmlSpotRecipeDom: function() {
    $('#spot-recipe-list').html(
      this.makeItemDomStr(
        this.spotRecipeData,
        this.makeSpotRecipeItemHtml,
        5
      )).show();

  },
  makeSpotRecipeItemHtml: function(itemData) {
    var html = '<a class="__recipe__item" href="[[LINK]]" target="_blank" data-spot-item-id="[[RECIPEID]]"><div><div class="__thumb"><div class="__thumb-image" style="background-image:url([[IMG]])"></div></div><div class="__recipe__item-notes"><span class="__difficultly">[[DIF]]</span><span class="__calorie">[[KCAL]]kcal</span></div></div><div><h3>[[TITLE]]</h3><p>[[TEXT]]</p></div></a>';
    html = html.replace('[[TITLE]]', itemData.r_title);
    html = html.replace('[[RECIPEID]]', itemData.recipeId);
    html = html.replace('[[LINK]]', itemData.r_url);
    html = html.replace('[[DIF]]',  itemData.r_difficulty);
    html = html.replace('[[KCAL]]',  itemData.r_nutrition_value);
    html = html.replace('[[IMG]]',  itemData.r_thumbnail);
    html = html.replace('[[TEXT]]', itemData.r_IngredientName.join('/'));
    return html;
  },

  // spot video
  setHtmlSpotVideoFromKeyword: function() {
    var self = Fiver;
    var dfd = $.Deferred();
    var spotData = self.retSelectedSpotData();
    this.spotVideoData = null;
    console.log("setHtmlSpotVideoFromKeyword",spotData);

    self.fetchRelatedVideoFromKeyword(spotData.vod, spotData.vod_sc)
      .done(function(data) {
        self.spotVideoData = data;
        self.setHtmlSpotVideoDom();
        dfd.resolve();
        $('#spot-related').show();
      })
      .fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },
  setHtmlSpotVideoDom: function() {
    $('#spot-related-video-list').html(
      this.makeItemDomStr(
        this.retSpotVideoItems(),
        this.makeSpotVideoItemHtml,
        5
      ));
  },
  makeSpotVideoItemHtml: function(itemData) {
    var html = '<a class="__video__item" href="[[LINK]]" target="_blank" data-spot-item-id="[[VIDEOID]]"><div class="__video__item__head"><div class="__thumb"><div class="__thumb-image"  style="background-image:url([[IMG]])"></div></div><h3>[[TEXT]]</h3></div><div class="__video__item__body"><div><p>[[DESCRIPTINO]]</p></div></div></a>';

    html = html.replace('[[LINK]]', itemData.vod_url.value);
    html = html.replace('[[VIDEOID]]', itemData.clip.value.split('jp/')[1]);
    html = html.replace('[[DESCRIPTINO]]', itemData.description.value);
    html = html.replace('[[IMG]]',  itemData.img.value);
    html = html.replace('[[TEXT]]', itemData.subtitle.value);
    return html;
  },
  setHtmlListMapInfo: function(no) {
    var nextDom = $('#list-map-desc__next');
    var prevDom = $('#list-map-desc__prev');
    var spotData = this.retLodDataFromNumber(no);
    var itemLength = this.retLodItems().length;
    var setView = function(tgt, value, suffix) {
      var str = suffix || '';
      if (value == 0 ||
          value == '') {
        tgt.parent().hide();
      } else {
        tgt.parent().show();
        tgt.html(value + str);
      }
    };

    $('#list-map-title').html(spotData.name);
    $('#list-map-spot').html(spotData.category);
    $('#list-map-duration').html(Number(spotData.duration).toFixed(1) + ' hours');
    $('#list-map-distance').html(Number(spotData.distance).toFixed(1) + ' km');
    setView($('#list-map-time'), spotData.stay_time, ' mins');
    setView($('#list-map-average-price'), spotData.average_price);

    // データが１つなら矢印は非表示
    if (itemLength == 1) {
      nextDom.hide();
      prevDom.hide();
      return ;
    } else {
      nextDom.show();
      prevDom.show();
    }

    var nextNo = no + 1;
    var prevNo = no - 1;
    if (nextNo >= itemLength) {
      nextNo = 0;
    }
    if (prevNo < 0) {
      prevNo = itemLength - 1;
    }
    prevDom.data('list-map-prev', prevNo);
    nextDom.data('list-map-next', nextNo);
  },
  retLinkOfMapAppBttonLinks() {
    var data = this.retSelectedSpotLocations();
    var waypoint = data.lat + ',' + data.lon;
    var param_start = {
      saddr: this.settingData.start.geo.lat + ',' + this.settingData.start.geo.lng,
      daddr: waypoint,

      // google Map options
      f: 'd',  //Driving
    };

    var param_dest = {
      saddr: waypoint,
      daddr: this.settingData.dest.geo.lat + ',' + this.settingData.dest.geo.lng,

      // google Map options
      f: 'd',  //Driving
    };
    return [this.googleMapLink + $.param(param_start), this.googleMapLink + $.param(param_dest)];
  },

  setPulldownForSpots: function() {
    var baseHtml = '<option value="[[ADDRESS]]" data-pulldown-latlng="[[LATLNG]]">[[ADDRESS]]</option>';
    var html = '';

    var makeHtml = function(spotList) {
      var ret = '';
      if (spotList) {
        for (var i = 0; i < spotList.length ; i++) {
          var tmp = '';
          tmp = baseHtml.replace(/\[\[ADDRESS\]\]/g, spotList[i].address);
          ret += tmp.replace('[[LATLNG]]', spotList[i].latlng);
        }
      }
      return ret;
    };

    html = makeHtml(this.getStorageForSpots());
    html += makeHtml(this.listForDefaultSpot);
    $('.spot-list').html(html);
  },

  loader: function(bool) {
    if (bool) {
      window.loading.show();
    } else {
      window.loading.hide();
    }
  },

  //========================================================
  // common
  //========================================================
  isGeolocationApi: function() {
    return navigator.geolocation? true: false ;
  },
  localStorage: {
    set: function(key, val) {
      return window.localStorage.setItem(key, val);
    },
    get: function(key) {
      return window.localStorage.getItem(key);
    },
    remove: function(key) {
      return window.localStorage.removeItem(key);
    }
  },
  toHuorsFromSec: function(sec) {
    var min = sec / 60;
    return this.toHuorsFromMin(min);
  },
  toHuorsFromMin: function(min) {
    var hm = 0;
    var sec = min * 60;
    var h = min/ 60 | 0;
    var m = min % 60 | 0;
    // 小数点以下切り上げ
    var _m = Math.ceil(parseFloat(m / 10));
    if (_m == 6) {
      h++;
      _m = 0;
    }
    hm = h + '.' + _m;
    return parseFloat(hm);
  },
  sendLog: function(event, param) {
    var sendParam = {
      tab: 'AfterFiver',
      event: event,
    };

    if (param) {
      sendParam = $.extend(sendParam, param);
    }
    sbc(sendParam);
  }
};
