var Tv = {
  firstView: false,
  defaultAjaxOption: {
    cache:    true,
    type:     'GET',
    url:      '',
    dataType: 'json',
    data:     {},
    timeout: 10000,
  },
  logEvent: {
    tab:    'mainpageShow',
    vod:    'vodSelect',
    next:   'nextSelect',
  },
  
  videoLimit: 50,
  
  // 抽出したキーワード郡の前後を「,」で連結
  wordDictionary: ',cane,Okinoerabu_Island,Kit,Pancoast,Okinoerabu,Nagamura,Kumano,Shugendo,Buddhism,Nara,Kyoto,Kii,Kodo,Kii_Hanto,shakuhachi,Neptune,Kaizan,ShintoismYamanashi,nishikigoiwashiInden,KoshuYamanobe,temple,Tohokuhot-springDate,Masamune,Akiu,Sendaicastle,Tendo,shogi,festival,Yamagata,UNESCO,Kukai,Koyasan,shukuboMiyako,Takachiho,KyushuMiyazaki,mythYokaguraToyamaMeiji,BuddhistButsudanIiyamaNaganoCastle,TomonouraHayao,Edo_PeriodSetoHiroshima,Edosake,TokyoAkitaIshigakiSword,YagyuAikidoswordkendoTokugawa,shogunIYA,Iyasamurai,ShikokuShangri-la,Tokushima,OdawaraIzunoodleMalaysiaFestivalRite,Somin-saiOshuIwate,riteZen,YatsugatakeAkadakeKozushimaShikinejima,Niijima,Meguro,Onsen,bath,onsenmangaanimation,Anime,Manga,animeMieTokaido,Sakashita-juku,Seki-juku,Kameyama-juku,Kameyama,Suzuka,Shimane,GodEbisugod,Mihonoseki,Nakaumi,Aofushigaki,Kitamaebune,Aofushigaki_ritual,MihoKotoshironushimythology,Iga,Ninja,aikido,Ise-ShimaKashiko-jima,YaesuHaneda,Airport,Nagasaki,Ishikawa,Otabi,Komatsu,Kabuki,kabuki_performance,highlight,excitement,MayDaikanyamaChristian,Takahashi_CityBichu,Okayama,UrbanOasis,FutakoTamagawaOlympicsShinjuku,OkubofoodBiei,soybean,TokachiHokkaido,carbonFukiya,Chugoku,Ainu,Kinosaki,retro_game_arcade,karaoke,Kinosaki_Onsenryokan,Nebuta_Festival,Aomori,Nebuta,Kabuki_storey,Kikaijima,KagoshimaMiyagiNaruko_Onsen,Kokeshi,toji,Naruko,kokeshi,Edo_era,OuIejima,battle,WarOkinawaWorld_War_IIChagu,Nanbu,Umako,Morioka,Ryo,Yamiso,sweetfish,Kujiayu,FallsYanaRiver,paper_lanternIbaraki,Kuji_RiverTsukimachiHimeji_CastleHimeji,radioHyogosomen,Hotaka,cycling,Takayama,OctoberyataikayakShakotan,Kaigan,cooking,Kushiro,TaitoKachikura,KuramaeOkachimachi,Olympic,Waseda,agriculture,Shinagawakonbu,oboro,Kakunodate,MichinokuIshiguroSamurai,Ehime,Uwajima,tonTsugarufruitBodhisattvaChichibu,Kannon,Saitama,',
  
  // VOD タイトル
  vodTitle: 'Related Video from NHK',
  relatedVodTitleList: ['VOD about nature from  NHK', 'VOD about tradition from  NHK', 'VOD about culture from  NHK'],
  
  // 関連番組取得用
  relatedType: ['nature', 'tradition', 'culture'],
  // 上記のカテゴリとAPI用Form要素の順番は合わせること
  relatedApiTgt: ['tv-nature-api', 'tv-tradition-api', 'tv-culture-api'],
  
  onairData: null,
  nextData: null,
  onairProgramId: null,
  currentRelatedType: '',
  
  init:function(){
    var self = this;
    this.loader(true);
    this.currentRelatedType = '';
    $('#tv-video-item').html('');
    
    var fetchData = function() {
      self.setVod().then(
        function(){},
//        self.setRelated,
        //setVodが失敗したら関連情報を取得
        self.setRelated
      ).then(
        setOther,
        setOther
      );
    };
    
    var setOther = function() {
      self.sendLogForPageShow();
      self.bindAction();
      
      var tgt = $('#tv-video-item');
      if(tgt.find('a').size() > 0) {
        $('#tv-video').show();
      } else {
        $('#tv-video').hide();
      }
      self.loader(false);
    };
    
    // 初回のみ実行
    if (!this.firstView) {
      this.firstView = true;
      this.bindOnece();
    }
    
    $.when(
      self.setOnair(),
      self.setNextProgram()
    ).done(function() {
      fetchData();
    })
    .fail(function() {
      self.sendLogForPageShow();
    });
  },
  
  sendLogForPageShow: function() {
    var type = 'program';
    if (this.currentRelatedType) {
      type = this.currentRelatedType;
    }
    
    this.sendLog(this.logEvent.tab, {
      program: this.onairProgramId,
      VODrelation: type,
      VOD: this.retVideoIdList(type)
    });
  },

  setOnair: function() {
    var self = Tv;
    var dfd = $.Deferred();
    var tgt = $('#tv-onair-api');
    
    self.fetchNHKLod(tgt.attr('action'), tgt.serialize())
      .done(function(data) {
        self.onairData = data;
        var res = data.results.bindings[0];
        var programId = res.E.value.split('jp/')[1];
        if (!programId) {
          programId = res.E.value;
        }
        self.onairProgramId = programId;
        
        $('#onair-title').text(res.title.value);
        $('#onair-title').data('program-id', programId);
        $('#onair-description').text(res.description.value);
        $('#onair-player').attr({src: 'http://www3.nhk.or.jp/nhkworld/app/live/?cid=nwd-app-iswc-live'});
        dfd.resolve();
      }).fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },
  
  setNextProgram: function() {
    var self = Tv;
    var dfd = $.Deferred();
    var tgt = $('#tv-next-api');
    self.fetchNHKLod(tgt.attr('action'), tgt.serialize())
      .done(function(data) {
        self.nextData = data;
        var res = data.results.bindings[0];
        var convertTime = function(time){
          var date = time.split('T');
          if (date.length) {
            return date[1];
          }
          return '';
        };
        
        var programId = res.E.value.split('jp/')[1];
        if (!programId) {
          programId = res.E.value;
        }
        
        $('#next-title').text(res.title.value);
        $('#next-title').data('program-id', programId);
        $('#next-description').text(res.description.value);
        $('#next-image').css('background-image', 'url(' + res.img.value + ')');
        $('#next-link').attr('href', res.link_url.value);
        $('#next-time').text(convertTime(res.onair.value) + ' - ' + convertTime(res.onairEnd.value));
        
        dfd.resolve();
      }).fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },
  
  setVod: function() {
    var self = Tv;
    var dfd = $.Deferred();
    var tgt = $('#tv-vod-api');
    var keywords = self.searchKeyword();
    var filterKeyword = [];
    self.vodData = null;
    
    for (var i = 0; i < keywords.length; i++) {
      filterKeyword.push(self.retContainesQuery(keywords[i]));
    }
    filterKeyword = filterKeyword.join(' || ');
    console.log("keyword",filterKeyword);
    
    self.fetchNHKLod(tgt.attr('action'), tgt.serialize().replace('REPLACEKEYWORD', filterKeyword))
      .done(function(data) {
        self.vodData = data;
        var res = data.results.bindings;

        if(!res || !res.length) {
          dfd.reject();
        }
        
        var dom = '<a class="__video__item" href="[[LINK]]" data-tv-program-id="[[ID]]" target="_blank"><div class="__video__item__head"><div class="__thumb"><div class="__thumb-image" style="background-image: url([[IMG]])"></div></div><h3>[[TITLE]]</h3></div><div class="__video__item__body"><div><p>[[DESC]]</p></div></div></a>';
        var html = '';
        var item = null;
        var tmp = '';
        var videoId = '';
        
        for (var i = 0; i < res.length; i++) {
          item = res[i];
          videoId = item.clip.value.split('jp/')[1];
          if (!videoId) {
            videoId = item.clip.value;
          }
          
          tmp = dom;
          tmp = tmp.replace('[[ID]]',    videoId);
          tmp = tmp.replace('[[TITLE]]', item.subtitle.value);
          tmp = tmp.replace('[[DESC]]',  item.description.value);
          tmp = tmp.replace('[[LINK]]',  item.vod_url.value);
          tmp = tmp.replace('[[IMG]]',   item.img.value);
          
          html += tmp + '\n';
          
          if (self.videoLimit <= i + 1) {break;}
        }
        
        $('#tv-video-item').html(html);
        $('#tv-video-item').parent().find('h2').html(self.vodTitle);
        
        dfd.resolve();
      }).fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },
  
  setRelated: function() {
    var self = Tv;
    var dfd = $.Deferred();
    var dataType = self.relatedType;
    var tgtList = self.relatedApiTgt;
    self.ralatedData = null;
    
    // dataTypeのカテゴリでランダム
    var filterKeyword = [];
    var typeNum = Math.floor( Math.random() * dataType.length );
    var apiTgt = $('#' + tgtList[typeNum]);
    
    self.fetchNHKLod(apiTgt.attr('action'), apiTgt.serialize())
      .done(function(data) {
        self.vodData = data;
        self.currentRelatedType = dataType[typeNum];
        var res = data.results.bindings;
        var dom = '<a class="__video__item" href="[[LINK]]" data-tv-' + dataType[typeNum] +'-id="[[ID]]" target="_blank"><div class="__video__item__head"><div class="__thumb"><div class="__thumb-image" style="background-image: url([[IMG]])"></div></div><h3>[[TITLE]]</h3></div><div class="__video__item__body"><div><p>[[DESC]]</p></div></div></a>';
        var html = '';
        var item = null;
        var tmp = '';
        var videoId = '';

        for (var i = 0; i < res.length; i++) {
          item = res[i];
          videoId = item.clip.value.split('jp/')[1];
          if (!videoId) {
            videoId = item.clip.value;
          }
          
          tmp = dom;
          tmp = tmp.replace('[[ID]]',    videoId);
          tmp = tmp.replace('[[TITLE]]', item.subtitle.value);
          tmp = tmp.replace('[[DESC]]',  item.description.value);
          tmp = tmp.replace('[[LINK]]',  item.vod_url.value);
          tmp = tmp.replace('[[IMG]]',   item.img.value);
          
          html += tmp + '\n';
          if (self.videoLimit <= i + 1) {break;}
        }
        
        $('#tv-video-item').append(html);
        $('#tv-video-item').parent().find('h2').html(self.relatedVodTitleList[typeNum]);

        dfd.resolve();
      }).fail(function() {
        dfd.reject();
      });
    return dfd.promise();
  },
  
  retVideoIdList: function(type) {
    var dataName = 'tv-[[TYPE]]-id'.replace('[[TYPE]]', type);
    var list = [];
    var item = null;
    
    $('#tv-video-item a').each(function(){
      item = $(this).data(dataName);
      if (item) {
        list.push(item);
      }
    });
    return list.join(',');
  },
  
  searchKeyword: function() {
    var dict = this.wordDictionary.toLowerCase();
    var description = $('#onair-description').text();
    var tmp = description.toLowerCase();
    var wordList = tmp.replace(/\./g, '').split(' ');
    var hitList = [];
    var ret = '';
    
    for (var i = 0; i < wordList.length; i++) {
      //１文字は除外
      if (wordList[i].length > 1) {
        word = ',' + wordList[i] + ',';
        if (dict.search(word) > -1) {
          hitList.push(wordList[i]);
        }
      }
    }

    if (hitList.length) {
      ret = hitList;
    }
    return ret;
  },
  
  // 1 ～ (len - 1) の数値を返す
  retRandomNum: function(len) {
    return Math.floor( Math.random() * (len - 1)) + 1;
  },
  
  fetchAjax: function(param ,onComplate ,onError) {
    var data = $.extend({}, this.defaultAjaxOption, param);
    $.ajax(data)
    .done(onComplate)
    .fail(onError);
  },
  
  fetchNHKLod: function(url, query) {
    var dfd = $.Deferred();
    Tv.fetchAjax({
        url: url,
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
  
  bindAction: function() {
    var self = Tv;
    
    $('#next-link').off('click').on('click', function(){
      self.sendLog(self.logEvent.next, {
        program: self.onairProgramId,
        VOD: $('#next-title').data('program-id')
      });
    });
    
    $('#tv-video-item a').off('click').on('click', function(){
      var relation = '';
      var videoId = '';
      console.log();
      
      var programId = $(this).data('tv-program-id');
      if (programId) {
        relation = 'program';
        videoId = programId;
      }
      else if (self.currentRelatedType) {
        relation = self.currentRelatedType;
        videoId = $(this).data('tv-' + self.currentRelatedType + '-id');
      }
      
      self.sendLog(self.logEvent.vod, {
        program: self.onairProgramId,
        VODrelation : relation,
        VOD: videoId
      });
    });
    
  },
  
  bindOnece: function() {
    $('.m-menu a').on('click', function(){
      if ($(this).data('menu-target') != 'content-tv') {
        $('#onair-player').attr({src: ''});
      }
    });
  },
  
  retContainesQuery: function(keyword) {
    var filters = [
        'CONTAINS(?description,"' + keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase() + '")',
        'CONTAINS(?description,"' + keyword.toUpperCase() + '")',
        'CONTAINS(?description,"' + keyword.toLowerCase() + '")',
    ].join(' || ');
    
    return filters;
  },
  
  loader: function(bool) {
    if (bool) {
      window.loading.show();
    } else {
      window.loading.hide();
    }
  },
  
  sendLog: function(event, param) {
    var sendParam = {
      tab: 'WatchTV',
      event: event,
    };
    
    if (param) {
      sendParam = $.extend(sendParam, param);
    }
    sbc(sendParam);
  }
};

