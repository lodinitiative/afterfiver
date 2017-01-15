var Caputure = {
  CaputureView: false,
  displayClass: {
    start1: '.content-capture--start:eq(0)',
    start2: '.content-capture--start:eq(1)',
    detail: '.content-capture--detail',
  },

  dom:{
    start2:{
      ruby:null,
      keywords:null,
    },
  },

  api:{
    furigana:{ url:"./api/furigana.php", },
    google:{
      key:"AIzaSyB5czCuRaFM7ZgV0-POcRKY9Z-aDolhNtQ",
      search_engine_id:"002438590352916726680:f8ssyo_udi4",
      translate:{ url:"https://www.googleapis.com/language/translate/v2" },
      search_img:{ url:"https://www.googleapis.com/customsearch/v1" },
    },
    dbpedia:{
      endpoint:"http://dbpedia.org/sparql",
    },
    nhk_world:{
      endpoint:"http://nw-lod.nhk.jp/sparql",
      key:"kl75K1rPBgBcew7QnhsVfOuRrFAKoLG8",
    },
  },

  logEvent: {
    tab:    'mainpageShow',
    gcv:    'gcvAPI',
    select: 'select',
    search: 'search',
    detail: 'detailShow',
    recipe: 'recipeSelect',
    vod:    'vodSelect',
  },

  platform:"",

  init:function(){
    if (!this.CaputureView) {
        this.clickedButtonAction();
        this.CaputureView = true;

        // DOMの設定
        this.dom.start2.ruby = $(this.displayClass.start2+" .content-head .__ruby");
        this.dom.start2.keywords = $(this.displayClass.start2+" .content-head .__keywords__input :text");

        this.detail.self = this;
        this.start.self  = this;

        if( navigator.platform ==="iPhone" || navigator.platform === "iPad" || navigator.platform === "iPod" ){
            this.platform = "iOS";
        }else{
            this.platform = "other";
        }
    }
    // 画像ファイルを空にする
    $(".__capture input[type=file]").val('');
    // OCR画像を削除
    $("#picture_div").remove();
    // スタート画面へ遷移
    this.showStart1Display();
  },

  /*
   * 検索画面
   */
  start:{
    self:null,
    rate:1,  //文字を解析する画像の表示倍率
    min_rate:1,
    max_rate:1,
    imgCtrlList:[],  //タッチ位置等の保存用配列
    touchTime:0,  //前回タッチした時刻


    hiragana:"", // ルビ振りで取得したふりがなの保存用

    //検索
    search:function(){
      var parent = this.self;
      var self = this;
      var detail = parent.detail;
      var $start2 = $(parent.displayClass.start2);
      var $detail = $(parent.displayClass.detail);
      var word    = $start2.find(".__keywords__input input[type=text]").val();
      var word_en = $start2.find('.content-head .__ruby').text();

      parent.showDetailDisplay();
      //ログ
      parent.sendLog(parent.logEvent.search, {
          string:word
      });

      // メニューガイドの初期化
      detail.init();
      $detail.find('.__words__ruby').text(word_en);
      $detail.find('.__words__text').text(word);

      var match = word_en.match(/[^(]+/);
      word_en = (match) ? match[0].trim() : "";
      
      // ローディング
      window.loading.show();
      detail.dbpedia(word,word_en,self.hiragana); // dbpedia
      detail.translate(word);     // 翻訳
      detail.search_img(word);    // 画像検索
      $.when(
         // プロモーション用処理：「親子丼」「おやこどん」「おやこ丼」の場合に表示処理
         detail.setSpesialContent(word),
         detail.recipe(word,word_en),  // レシピ検索
         detail.nhkvod(word_en)   // VOD検索
      ).done(function(){
         detail.detailShow(word);
      }).fail(function(){
         detail.detailShow(word);
      });
    },

    cloud_vision_key:'AIzaSyB5czCuRaFM7ZgV0-POcRKY9Z-aDolhNtQ',
    cloud_vision_url:'https://vision.googleapis.com/v1/images:annotate',

    startMain:function(e){
      Promise.resolve(e.target.files[0])
      .then(Caputure.start.readFile)
      .then(Caputure.start.sendAPI)
      .then(Caputure.start.drawLine)
    },

    // requestJSON作成、送信 (CloudVisionAPI実行)
    sendAPI:function(base64string) {
      var $start2 = $(Caputure.displayClass.start2);
      // json作成
      var body = {
        requests: [
          {image: {content: base64string}, features: [{type: 'TEXT_DETECTION'}]}
        ]
      };
      var xhr = new XMLHttpRequest();
      xhr.open('POST', Caputure.start.cloud_vision_url + '?key=' + Caputure.start.cloud_vision_key, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      //リクエスト送信
      xhr.send(JSON.stringify(body));
      $start2.find("#picture_div").append('<div id="analyzing" style="position:absolute;left:0;top:0;font-size:150%;width:100%;height:100%;color:#888;background-color:#fff;opacity:0.9;text-align:center;padding:50% 0;">Analyzing the image...<div>');
      var p = new Promise(function(resolve, reject) {
        //状態が変わるたび実行
        xhr.onreadystatechange = function() {
          if (xhr.readyState != XMLHttpRequest.DONE){
            $start2.find("#analyzing").remove();
            return;
          }
          if (xhr.status >= 400){
              $start2.find("#analyzing").remove();
              //画像を削除
              $start2.find("#picture_div").append('<div style="position:absolute;left:0;top:0;font-size:150%;width:100%;height:100%;color:#f00;background-color:#fff;text-align:center;padding:50% 0;">Failed to analyze image.<div>');
              return reject({message: 'Failed with ' + xhr.status + xhr.statusText});
          }
          resolve(JSON.parse(xhr.responseText));
        };
      });

      //ログ
      Caputure.sendLog(Caputure.logEvent.gcv);

      return p;
    },

    //矩形表示
    drawLine:function(vals) {
      var $start2 = $(Caputure.displayClass.start2);
      var $pic = $start2.find("#picture");
      var $div = $start2.find("#picture_div");

      //Exifの回転・反転
      var orientation = 1;
      EXIF.getData($pic[0], function() {
          orientation = EXIF.getTag(this, "Orientation");
      });

      var img_w = $div.width();
      var img_h = $div.height();
      if( $pic[0].naturalWidth > 0 ){
        img_w = $pic[0].naturalWidth;
        img_h = $pic[0].naturalHeight;
        if(Caputure.platform === "iOS" && orientation >= 5 && orientation <= 8){ //回転していたら縦横のサイズ入れ替え
          var tmp = img_w;
          img_w = img_h;
          img_h = tmp;
        }

        Caputure.start.rate = $div.width() / $pic[0].naturalWidth;
        Caputure.start.min_rate = Caputure.start.rate;

        if( $pic[0].naturalWidth < $div.width() ){  //画像が画面より小さい
          Caputure.start.max_rate = Caputure.start.rate * 2;
        }else{  //画像が画面より大きい
          Caputure.start.max_rate = ($pic[0].naturalWidth * 2) / $div.width();
        }
        //画面幅まで拡大・縮小
        $pic.attr("width", $div.width());
      }else{
        Caputure.start.rate = 1;
        Caputure.start.min_rate = 1;
        Caputure.start.max_rate = 2;
      }

      $.each(vals["responses"][0], function(pSeq, data) {
        // 最初の行は使わないので削除
        data.shift();
        $.each(data, function(cSeq, val){
          var point = val["boundingPoly"]["vertices"];
          //座標計算
          var x_list = [];
          var y_list = [];
          for(var i=0; i<point.length; i++){
              x_list.push(point[i]["x"] === void 0 ? 0 : parseInt(point[i]["x"]));
              y_list.push(point[i]["y"] === void 0 ? 0 : parseInt(point[i]["y"]));
          }
          x_list.sort(function(a,b){return a-b;});
          y_list.sort(function(a,b){return a-b;});
          var x1 = x_list[0];
          var x2 = x_list[x_list.length-1];
          var y1 = y_list[0];
          var y2 = y_list[y_list.length-1];

          /* orientation（回転・反転）の補正
           *   1 : そのまま
           *   2 : 上下反転(上下鏡像?)
           *   3 : 180度回転
           *   4 : 左右反転
           *   5 : 上下反転、時計周りに270度回転
           *   6 : 時計周りに90度回転
           *   7 : 上下反転、時計周りに90度回転
           *   8 : 時計周りに270度回転
           */
          if(Caputure.platform === "iOS"){  //iOSのみorientationを反映
            var tmp_x1 = x1;
            var tmp_x2 = x2;
            var tmp_y1 = y1;
            var tmp_y2 = y2;
            //上下反転
            if(orientation == 2 || orientation == 5 || orientation == 7){
              tmp_y1 = img_h - y2;
              tmp_y2 = img_h - y1;
            }
            //左右反転
            if(orientation == 4){
              tmp_x1 = img_w - x2;
              tmp_x2 = img_w - x1;
            }
            //90度回転
            if(orientation == 6 || orientation == 7){
              tmp_x1 = img_h - y2;
              tmp_x2 = img_h - y1;
              tmp_y1 = x1;
              tmp_y2 = x2;
            }
            //180度回転
            if(orientation == 3){
              tmp_x1 = img_w - x2;
              tmp_x2 = img_w - x1;
              tmp_y1 = img_h - y2;
              tmp_y2 = img_h - y1;
            }
            //270度回転
            if(orientation == 5 || orientation == 8){
              tmp_x1 = y1;
              tmp_x2 = y2;
              tmp_y1 = img_w - x2;
              tmp_y2 = img_w - x1;
            }
            x1 = tmp_x1;
            x2 = tmp_x2;
            y1 = tmp_y1;
            y2 = tmp_y2;
          }
          var w = x2 - x1;
          var h = y2 - y1;
          //表示サイズに合わせて座標調整
          var disp_x = $pic.position().left + x1 * Caputure.start.rate;
          var disp_y = $pic.position().top  + y1 * Caputure.start.rate;
          var disp_w = w * Caputure.start.rate;
          var disp_h = h * Caputure.start.rate;
          //表示
          var text_frame = $('<div></div>')
                .attr("class", "text_frame")
                .attr("data-value", val["description"])
                .attr("orgw",w).attr("orgh",h)
                .attr("orgx",x1).attr("orgy",y1)
                .css({
                  position:"absolute"
                  , left  :disp_x+"px"
                  , top   :disp_y+"px"
                  , width :disp_w+"px"
                  , height:disp_h+"px"
                  , border:"3px solid #ee0"
          });
          $start2.find("#picture_div").append(text_frame);
        });

        // 矩形クリックイベント
        $start2.find(".text_frame").on('click', function(e){
          var text = $start2.find(".__keywords__input").find("input[type=text]");
          text.val(text.val() + $(this).attr('data-value'));
          $(this).css({"background-color": "rgba(233,233,0,0.5)"});
          Caputure.start.furiganaService(text.val());
          //ログ
          Caputure.sendLog(Caputure.logEvent.select, {
              string:text.val()
          });
        });
        // clearボタン押下時
        $start2.find(".__keywords__input").find(".__keywords__clear").on('click', function(){
          $(".text_frame").css("background-color", "");
        });
      });
      return vals;
    },

    // アップロードファイル読み込み
    readFile:function(file) {
      var $start2 = $(Caputure.displayClass.start2);

      var reader = new FileReader();
      reader.readAsDataURL(file);

      var imgData = new Promise(function(resolve, reject) {
        reader.onload = function(e) {
          // 画像が読み込まれた段階で画像表示
          var img = new Image();
          img.src = reader.result;

          //表示を初期化
          $start2.find(".__keywords__input").find("input[type=text]").val("");
          $start2.find(".__ruby").html("&nbsp;");
          $start2.find("#picture_div").remove();
          Caputure.start.rate = 1;
          Caputure.start.min_rate = 1;
          Caputure.start.max_rate = 1;
          $start2.find(".copyright").parent().css("z-index","1").prev().css("z-index","1").css("background-color","#fff");

          //画像表示
          var picture_div = $('<div id="picture_div" style="width:100%;height:100%;overflow:hidden;background-color:#666;"></div>');
          $start2.find(".__capture__preview").after(picture_div);

          var $pic = $("<img/>").attr("id", "picture")
          .attr("src", reader.result).attr("width", picture_div.width()).css("position", "relative");
          picture_div.append($pic);

          //画像操作用イベント
          var imgCtrlList = Caputure.start.imgCtrlList;
          $pic.on('touchstart', function(){//タッチ
            $.each(event.changedTouches, function(i, touch){
              //追加
              var ctrl = {
                identifier:touch.identifier,
                startX:touch.screenX,
                startY:touch.screenY,
                endX:touch.screenX,
                endY:touch.screenY
              };
              imgCtrlList.push(ctrl);
            });
            Caputure.start.touchTime = new Date().getTime();
          });
          //スワイプイベント
          $pic.on('touchmove', function(){
            $.each(event.targetTouches, function(i, touch){
              $.each(imgCtrlList, function(j, ctrl){
                if(touch.identifier == ctrl.identifier){
                  //更新
                  ctrl.startX = ctrl.endX;
                  ctrl.startY = ctrl.endY;
                  ctrl.endX = touch.screenX;
                  ctrl.endY = touch.screenY;
                  return false;
                }
              });
            });

            if(event.targetTouches.length >= 2){
              //2箇所(以上)なら拡大・縮小
              var nowTime = new Date().getTime();
              if(nowTime - Caputure.start.touchTime < 100){  //0.1秒以上経過していなかったら処理しない
                return;
              }else{
                Caputure.start.touchTime = nowTime;
                Caputure.start.scaleImage(imgCtrlList[0], imgCtrlList[1]);
              }
            }else{
              //1箇所なら移動
              Caputure.start.moveImage(imgCtrlList[0]);
            }
          });
          //タッチ終了イベント
          $pic.on('touchend', function(){
            //終了した分を削除
            $.each(event.changedTouches, function(i, touch){
              $.each(imgCtrlList, function(j, ctrl){
                if(touch.identifier == ctrl.identifier){
                  imgCtrlList.splice(j,1);
                  return false;
                }
              });
            });
          });

          $start2.find(".__capture__preview").css("display","none");

          resolve(e.target.result.replace(/^data:image\/(png|jpeg);base64,/, ''));
        };
      });

      // base64画像データ
      return imgData;
    },

    //（スワイプで）画像を移動
    moveImage:function(imgCtrl){
      var $start2 = $(Caputure.displayClass.start2);
      var $pic = $start2.find("#picture");

      //移動量の計算
      var h = imgCtrl.endX - imgCtrl.startX;
      var v = imgCtrl.endY - imgCtrl.startY;
      var org_left = $pic.position().left;
      var org_top  = $pic.position().top;
      var left = org_left + h;
      var top  = org_top  + v;

      //表示位置調整
      var div_w = $start2.find("#picture_div").width();
      var div_h = $start2.find("#picture_div").height();
      //横
      if($pic.width() <= div_w){
        //画像が小さい場合は画面内に収める
        if(left < 0){
          left = 0;
          h = left - org_left;
        }else if(left + $pic.width() > div_w){
          left = div_w - $pic.width();
          h = left - org_left;
        }
      }else{
        if(left + $pic.width() < div_w ){
          left = div_w - $pic.width();
          h = left - org_left;
        }else if(left > 0){
          left = 0;
          h = left - org_left;
        }
      }
      //縦
      if($pic.height() <= div_h){
        //画像が小さい場合は表示エリア上部に固定
        top = 0;
        v = top - org_top;
      }else{
        if(top + $pic.height() < div_h ){
          top = div_h - $pic.height();
          v = top - org_top;
        }else if(top > 0){
          top = 0;
          v = top - org_top;
        }
      }

      //画像及び矩形を移動
      $pic.css({ top: top, left: left });
      $start2.find("#picture_div .text_frame").each(function(){
        $(this).css({ top: $(this).position().top + v, left: $(this).position().left + h });
      });
    },

    //画像を拡大・縮小する
    scaleImage:function(imgCtrl, imgCtrl2){
      var $start2 = $(Caputure.displayClass.start2);
      var $pic = $start2.find("#picture");
      var $div = $start2.find("#picture_div");

      //2点それぞれの移動前後の距離を計算
      var distance1 = Math.sqrt(
                        Math.pow(imgCtrl2.startX - imgCtrl.startX, 2) +
                        Math.pow(imgCtrl2.startY - imgCtrl.startY, 2) );
      var distance2 = Math.sqrt(
                        Math.pow(imgCtrl2.endX - imgCtrl.endX, 2) +
                        Math.pow(imgCtrl2.endY - imgCtrl.endY, 2) );

      //変更前の拡大率
      var before_rate = Caputure.start.rate;
      var diff = distance2 - distance1;
      if(diff < 0){  //縮小
          Caputure.start.rate -= 0.01;
        if(Caputure.start.rate < Caputure.start.min_rate){
          Caputure.start.rate = Caputure.start.min_rate;
        }
      }else if(diff > 0){  //拡大
          Caputure.start.rate += 0.01;
        if(Caputure.start.rate > Caputure.start.max_rate){
          Caputure.start.rate = Caputure.start.max_rate;
        }
      }

      //画面中央を中心に拡大・縮小するように位置調整
      var move_w = -(Caputure.start.rate - before_rate) * $pic[0].naturalWidth / 2;
      var move_h = -(Caputure.start.rate - before_rate) * $pic[0].naturalHeight / 2;
      var ctrl = {
              identifier:0,
              startX:0,
              startY:0,
              endX:move_w,
              endY:move_h
      };
      Caputure.start.moveImage(ctrl);

      //矩形を拡大・縮小
      $pic.animate({width:$pic[0].naturalWidth * Caputure.start.rate}, 100);
      var left = $pic.position().left;
      var top  = $pic.position().top;
      $start2.find("#picture_div .text_frame").each(function(){
        //サイズの計算
        var w = parseFloat($(this).attr("orgw")) * Caputure.start.rate;
        var h = parseFloat($(this).attr("orgh")) * Caputure.start.rate;
        var x = left + parseFloat($(this).attr("orgx")) * Caputure.start.rate;
        var y = top  + parseFloat($(this).attr("orgy")) * Caputure.start.rate;
        $(this).animate({
          width :w+"px",
          height:h+"px",
          left  :x+"px",
          top   :y+"px"
        }, 100);
      });
    },

    furiganaService:function(word){
      if (word == "") return ;
      var parent = this.self;
      var self = this;
      // 初期化
      parent.dom.start2.ruby.html("&nbsp;");
      self.hiragana = "";

      $.ajax({
        url:parent.api.furigana.url,
        data:{sentence:word},
      }).done(function(xml){
        var ruby = "";
        var hiragana = "";
        $(xml).find("WordList Word").each(function(i){
          var roman = $(this).children("Roman").text();
          var furigana = $(this).children("Furigana").text();
          var surface = $(this).children("Surface").text();
          ruby += (roman!="") ? roman : surface;
          hiragana += (furigana!="") ? furigana : surface;
        });
        parent.dom.start2.ruby.text(ruby);
        self.hiragana = hiragana;
        parent.dom.start2.ruby.show();
      });
    }
  },


  //========================================================
  // メニューガイド処理
  //========================================================
  detail:{
    detailView:false,
    self:null,
    dom:{
      words_ruby:null,
      words_text:null,
      dbpedia:null,
      translated:null,
      image_search:null,
      recipe:null,
      video:null,
    },

    // 初期処理
    init:function(){
      if (!this.detailView) {
          // DOMの取得
          var detailClass = this.self.displayClass.detail;
          this.dom.words_ruby   = $(detailClass+" .__words__ruby");
          this.dom.words_text   = $(detailClass+" .__words__text");
          this.dom.dbpedia      = $(detailClass+" .__dbpedia");
          this.dom.translated   = $(detailClass+" .__result-summary h2:contains(Translated Words)").next();
          this.dom.image_search = $(detailClass+" .__image-search");
          this.dom.recipe       = $("#capture-recipe");
          this.dom.video        = $(detailClass+" .__video");
          // videoが二つあるのでひとつ削除
          this.dom.video.eq(1).remove();
          this.detailView = true;
      }

      //// 値を初期化
      // 検索ワード（日本語・英字）
      this.dom.words_ruby.empty();
      this.dom.words_text.empty();
      // DBPedia
      this.dom.dbpedia.empty();
      // 翻訳
      this.dom.translated.empty();
      // DBPedia
      this.dom.dbpedia.empty();
      // 画像検索
      this.dom.image_search.empty();
      // レシピ
      this.dom.recipe.empty();
      this.dom.recipe.parent().hide();
      // VOD
      this.dom.video.empty();
      this.dom.video.parent().hide();
    },

    // 文字列フォーマット
    str_format:function(str, keys){
        var newStr = str;
        for (var key in keys) {
            newStr = newStr.replace(new RegExp('{'+key+'}', 'g'), keys[key]);
        }
        return newStr;
    },

    // Google翻訳
    translate:function(word){
        if (word == "") return ;
        var parent = this.self;
        var self = this;

        $.getJSON(parent.api.google.translate.url,
            {
            key:parent.api.google.key,
            q:word,
            target:'en', // 翻訳先言語
            },
            function(json) {
          var translations = json['data']['translations'];
          self.dom.translated.text(translations[0]['translatedText']);
        });
    },

    // Google画像検索
    search_img:function(word){
        if (word == "") return ;
        var parent = this.self;
        var self = this;

        $.getJSON(parent.api.google.search_img.url,
            {
            key:parent.api.google.key,
            cx:parent.api.google.search_engine_id,
            searchType:'image',
            q:word,
            },
            function(json) {
          $.each(json.items, function(key, val){
            var html = '<a href="[[link]]" target="_blank"><div class="__thumb-image" style="background-image:url([[thumbnailLink]])"></div></a>';
            html = html.replace("[[thumbnailLink]]", val.image.thumbnailLink);
            html = html.replace("[[link]]", val.link);
            self.dom.image_search.append(html);
          })
        });
    },

    // DBPedia検索
    dbpedia:function(keyword, roman, hiragana){
        var parent = this.self;
        var self   = this;
        var str_cnt = 200;
        var format = {
            // キーワード
            keyword:keyword,
            // 頭大文字のローマ字
            roman_proper:roman.charAt(0)+roman.substring(1).toLowerCase(),
            // 全小文字のローマ字
            roman_lower:roman.toLowerCase(),
            // 全大文字のローマ字
            roman_upper:roman.toUpperCase(),
            // ひらがな
            hiragana:hiragana,
            // カタカナ
            katakana:parent.hiraToKana(hiragana),
        };

        $.ajax({url:parent.api.dbpedia.endpoint, crossDomain:true,
          data:{query:this.str_format(this.dbpedia_query, format),
                format:'json',
                "default-graph-uri":"http://dbpedia.org",},
        }).done(function(json){
          var items = json.results.bindings;
          if (items.length > 0) {
            var textLength = items[0].abstract.value.length;
            if (textLength > str_cnt) {
                var showText = items[0].abstract.value.substring(0, str_cnt);
                var hideText = items[0].abstract.value.substring();
                var html = '[[showText]]<span class="hide">[[hideText]]</span><span class="__dbpedia__toggle">&nbsp;<a href="javascript:void(0);" onclick="">…more</a></span>';
                html = html.replace("[[showText]]", showText);
                html = html.replace("[[hideText]]", hideText);
                self.dom.dbpedia.html(html).find('.hide').hide();
                self.dom.dbpedia.find('.__dbpedia__toggle a').css({color:"blue", "text-decoration":"underline"});
            } else {
                self.dom.dbpedia.text(items[0].abstract.value);
            }
          }
        });
    },

    // レシピ検索（レシピを表示する）
    recipe:function(word,word_en){
//        if (word_en == "") return;
        if (word == "") return;
        var parent = this.self;
        var self   = this;
        var d = $.Deferred();

        $.ajax({url:parent.api.nhk_world.endpoint, crossDomain:true,
          data:{key:parent.api.nhk_world.key,
                query:this.str_format(this.recipe_query,
                    {
//                     roman_proper:word_en.charAt(0).toUpperCase()+word_en.slice(1).toLowerCase(),
//                     roman_lower:word_en.toLowerCase(),
//                     roman_upper:word_en.toUpperCase(),
                     word:word}),
                    }
        }).done(function(json){
            var items = json.results.bindings;
            self.recipeDisplay(items);
            d.resolve();
        }).fail(function() {
            d.resolve();
        });
        return d.promise();
    },

    // レシピ表示
    recipeDisplay:function(items){
        if (items.length == 0) return; // 空の場合は、スルー
        var parent = this.self;
        var self   = this;

        var recipe_list = []; // IDごとに格納
        var showed_url_list = []; // 表示確定されたレシピURL
        var pre_recipeId = null;
        var cnt = 0;
        var limit = 5;
        var nutrition_limit = 10;
        var nutrition_cnt = 0;

        // データ整形
        $.each(items, function(i, item){
          var recipeId = item.Recipe.value.split('#')[1];

          // 最初、またはレシピIDが変更された場合
          if (i==0 || recipeId!=pre_recipeId) {
            // 表示確定されているURLの場合は、スルー
            if(showed_url_list.indexOf(item.r_url.value) >= 0) return true;
            showed_url_list.push(item.r_url.value);
            cnt++;
            if (cnt > limit) return false; // 最大値を超えたら終了

            pre_recipeId = recipeId;
            nutrition_cnt = 0;

            // レシピ新規作成
            recipe_list[cnt-1] = {
                    recipeId: recipeId,
                    r_title: item.r_title.value,
                    r_url: item.r_url.value,
                    r_thumbnail: item.r_thumbnail.value,
                    r_difficulty: item.r_difficulty.value,
                    r_IngredientName: [],
                    r_nutrition_value: item.r_nutrition_value.value
                };
          }

          nutrition_cnt++;
          // 食材の最大値を超えたとき
          if (nutrition_cnt == nutrition_limit+1){
              recipe_list[cnt-1].r_IngredientName.push("…");
          // 前回から最大値を超えている
          } else if (nutrition_cnt-1 > nutrition_limit) {
              return true;
          } else {
            // 食材を追加
            recipe_list[cnt-1].r_IngredientName.push(item.r_IngredientName.value);
          }
        });

        // レシピHTML設定
        $.each(recipe_list, function(i, row){
          var html = '<a class="__recipe__item" href="[[LINK]]" target="_blank" data-detail-item-id="[[RECIPEID]]"><div><div class="__thumb"><div class="__thumb-image" style="background-image:url([[IMG]])"></div></div><div class="__recipe__item-notes"><span class="__difficultly">[[DIF]]</span><span class="__calorie">[[KCAL]]kcal</span></div></div><div><h3>[[TITLE]]</h3><p>[[TEXT]]</p></div></a>';
          html = html.replace('[[TITLE]]', row.r_title);
          html = html.replace('[[RECIPEID]]', row.recipeId);
          html = html.replace('[[LINK]]', row.r_url);
          html = html.replace('[[DIF]]',  row.r_difficulty);
          html = html.replace('[[KCAL]]',  row.r_nutrition_value);
          html = html.replace('[[IMG]]',  row.r_thumbnail);
          html = html.replace('[[TEXT]]', row.r_IngredientName.join('/'));
          self.dom.recipe.append(html);
        });
        // 画面表示
        self.dom.recipe.parent().show();
    },
    // VOD検索
    nhkvod:function(word_en){
        if (word_en == "") return;
        var parent = this.self;
        var self = this;
        var d = $.Deferred();
        var filters = [
                       'CONTAINS(?description,"'+word_en.charAt(0).toUpperCase()+word_en.slice(1).toLowerCase()+'")',
                       'CONTAINS(?description,"'+word_en.toUpperCase()+'")',
                       'CONTAINS(?description,"'+word_en.toLowerCase()+'")',
                   ].join(' || ');

        $.ajax({url:parent.api.nhk_world.endpoint, crossDomain:true,
          data:{key:parent.api.nhk_world.key,
                query:this.str_format(this.vod_query, {filters:filters}),},
        }).done(function(json){
            var items = json.results.bindings;
            self.nhkvodDisplay(items);
            d.resolve();
        }).fail(function() {
            d.resolve();
        });
        return d.promise();
    },

    // VOD表示
    nhkvodDisplay:function(items){
        if (items.length == 0) return ; // 空の場合はスルー
        var parent = this.self;
        var self   = this;

        $.each(items, function(key, item){
            // VOD HTML設定
            var html = '<a class="__video__item" href="[[LINK]]" target="_blank" data-detail-item-id="[[VIDEOID]]"><div class="__video__item__head"><h3>[[TEXT]]</h3></div><div class="__video__item__body"><div class="__thumb"><div class="__thumb-image"  style="background-image:url([[IMG]])"></div></div><div><p>[[DESCRIPTINO]]</p></div></div></a>';
            html = html.replace('[[LINK]]', item.vod_url.value);
            html = html.replace('[[VIDEOID]]', item.clip.value.split('jp/')[1]);
            html = html.replace('[[DESCRIPTINO]]', item.description.value);
            html = html.replace('[[IMG]]',  item.img.value);
            html = html.replace('[[TEXT]]', item.subtitle.value);
            self.dom.video.append(html);
        });
        self.dom.video.parent().show();
    },

    // プロモーション用処理  レシピ検索（レシピを表示する）
    setSpesialContent: function(word) {
      var detail = Caputure.detail;
      var d = $.Deferred();
      
      // 取得するレシピIDを指定
      var recipe1 = ['R3441'];
      var recipe2 = 'R4299,R4636,R3905,R3909,R2742,R4362'.split(',');
      var recipe3 = 'R4273,R4150,R3163,R3115,R4128'.split(',');
      
      var contentDom = $('#capture-special-content');
      var domGroup = [
        $('#capture-recipe-content1'),
        $('#capture-recipe-content2'),
        $('#capture-recipe-content3'),
      ];
      
      var domInit = function() {
          contentDom.hide();
        $.each(domGroup, function(i, dom) {
          dom.empty();
          dom.parent().hide();
        })
      };
      
      var fetch = function() {
        detail.recipe2(recipe1, domGroup[0]).then(
          function(){return detail.recipe2(recipe2, domGroup[1]);}
        ).then(
          function(){return detail.recipe2(recipe3, domGroup[2]);}
        ).then(function(){
          contentDom.show();
          d.resolve();
        });
      };
      
      // 初期化
      domInit();
      
      // 特定の文字列のみコンテンツを取得
      if ( word == '親子丼' ||
           word == 'おやこどん' ||
           word == 'おやこ丼'
      ) {
        fetch();
      } else {
        return d.resolve().promise();
      }
      return d.promise();
    },
    
    recipe2:function(recipeIdList, tgt){
        if (recipeIdList == "") return;
        var d = $.Deferred();
        var parent = this.self;
        var self   = this;
        var recipeUri = 'http://nw-lod.nhk.or.jp/recipe#';
        var filters = [];
        
        // クエリ用文字列を作成
        // STR(?Recipe)="http://nw-lod.nhk.or.jp/recipe#R4299" || ...
        for (var i = 0; i < recipeIdList.length; i++) {
          filters.push('STR(?Recipe)="'+ recipeUri + recipeIdList[i] + '"');
        }
        
        filters = filters.join(' || ');
        
        $.ajax({url:parent.api.nhk_world.endpoint, crossDomain:true,
          data:{key:parent.api.nhk_world.key,
                query:this.str_format(this.recipe_query2, {filters:filters}),},
        }).done(function(json){
            var items = json.results.bindings;
            
            self.recipeDisplay2(items, tgt);
            
            d.resolve();
        }).fail(function() {
            d.resolve();
        });
        return d.promise();
    },
    
    // レシピ表示
    recipeDisplay2:function(items, tgt){
        if (items.length == 0) return; // 空の場合は、スルー
        var parent = this.self;
        var self   = this;

        var recipe_list = []; // IDごとに格納
        var idx = 0;
        var limit = 5;
        var nutrition_limit = 10;
        var nutrition_idx = 0;

        // データ整形
        $.each(items, function(i, item){
          var recipeId = item.Recipe.value.split('#')[1];
          // レシピIDが変更された場合
          if (i!=0 && recipeId!=recipe_list[idx].recipeId) { idx++; nutrition_idx = 0; }
          // 最大値を超えたら終了
          if (idx+1 > limit) return false;

          if (!recipe_list[idx]) { // レシピ新規作成
            recipe_list[idx] = {
                recipeId: recipeId,
                r_title: item.r_title.value,
                r_url: item.r_url.value,
                r_thumbnail: item.r_thumbnail.value,
                r_difficulty: item.r_difficulty.value,
                r_IngredientName: [],
                r_nutrition_value: item.r_nutrition_value.value
            };
          }

          // 食材の最大値を超えたとき
          if (nutrition_idx+1 == nutrition_limit+1){
              recipe_list[idx].r_IngredientName.push("…");
          // 前回から最大値を超えている
          } else if (nutrition_idx > nutrition_limit) {
              return true;
          } else {
            // 食材を追加
            recipe_list[idx].r_IngredientName.push(item.r_IngredientName.value);
          }
          nutrition_idx++;
        });

        // レシピHTML設定
        $.each(recipe_list, function(i, row){
          var html = '<a class="__recipe__item" href="[[LINK]]" target="_blank" data-detail-item-id="[[RECIPEID]]"><div><div class="__thumb"><div class="__thumb-image" style="background-image:url([[IMG]])"></div></div><div class="__recipe__item-notes"><span class="__difficultly">[[DIF]]</span><span class="__calorie">[[KCAL]]kcal</span></div></div><div><h3>[[TITLE]]</h3><p>[[TEXT]]</p></div></a>';
          html = html.replace('[[TITLE]]', row.r_title);
          html = html.replace('[[RECIPEID]]', row.recipeId);
          html = html.replace('[[LINK]]', row.r_url);
          html = html.replace('[[DIF]]',  row.r_difficulty);
          html = html.replace('[[KCAL]]',  row.r_nutrition_value);
          html = html.replace('[[IMG]]',  row.r_thumbnail);
          html = html.replace('[[TEXT]]', row.r_IngredientName.join('/'));
          tgt.append(html);
        });
        // 画面表示
        tgt.parent().show();
    },
    // プロモーション用処理  レシピ検索（レシピを表示する） ここまで

    // ページ表示ログ
    detailShow:function(word){
      window.loading.hide();
      var parent = this.self;
      var self   = this;
      var detailClass = this.self.displayClass.detail;
      var recipes = [];
      $(detailClass+' .__recipe__item').each(function(){
        recipes.push($(this).data('detail-item-id'));
      });
      var vods = [];
      $(detailClass+' .__video__item').each(function(i){
        vods.push($(this).data('detail-item-id'));
      });
      parent.sendLog(parent.logEvent.detail, {
          string: word,
          recipes: recipes,
          VOD: vods,
      });
    },
  },

  //========================================================
  // display
  //========================================================
  //スタート画面へ遷移
  showStart1Display: function() {
      $(this.displayClass.start1).show();
      $(this.displayClass.start2).hide();
      $(this.displayClass.detail).hide();
      this.sendLog(this.logEvent.tab);
  },
  //文字認識画面へ遷移
  showStart2Display: function() {
      $(this.displayClass.start1).hide();
      $(this.displayClass.start2).show();
      $(this.displayClass.detail).hide();
  },
  //メニューガイド画面へ遷移
  showDetailDisplay: function() {
      $(this.displayClass.start1).hide();
      $(this.displayClass.start2).hide();
      $(this.displayClass.detail).show();
  },


  //========================================================
  // event
  //========================================================
  clickedButtonAction: function() {
    var self = this;
    //画面遷移用仮イベント
    //スタート画面→文字認識画面
    $(".__capture").find("input[type=file]").on("change", function(e){
      if (!e.target.files || e.target.files.length == 0) return;
      Caputure.start.startMain(e);
      self.showStart2Display();
    });
    $(this.displayClass.start2+" .content-head .__keywords__input").find("input[type=text]").on("change", function(e){
        self.start.furiganaService($(this).val());
    });
    //検索ボタン（メニューガイド画面へ）
    $(this.displayClass.start2+" .__keywords__submit").on('click', function(e){
        self.start.search();
    });
    //「<」ボタン（文字認識画面へ）
    $(this.displayClass.detail+" .__link-back").on("click", function(){
      self.showStart2Display();
    });

    //メニューガイドイベント
    //レシピ押下
    $(this.displayClass.detail+" .__recipe").on("click", ".__recipe__item", function(){
      self.sendLog(self.logEvent.recipe, {
        string:self.dom.start2.keywords.val(),
        recipe:$(this).data('detail-item-id')
      });
    })
    //VOD押下
    $(this.displayClass.detail+" .__video").on("click", ".__video__item", function(){
      self.sendLog(self.logEvent.vod, {
        string:self.dom.start2.keywords.val(),
        recipe:$(this).data('detail-item-id')
      });
    })

    // dbpedia省略表示・全表示
    $(this.displayClass.detail+" .__dbpedia").on("click", ".__dbpedia__toggle a", function(){
        var dbpedia = self.detail.dom.dbpedia;
        if ($(this).text() == "…more"){
          $(this).text("omit").parent().prev(".hide").animate({height:'show'}, 'slow');
        } else {
          $(this).text("…more").parent().prev(".hide").animate({height:'hide'}, 'slow');
        }
        return false;
    })
  },

  //========================================================
  // 共通処理
  //========================================================
  hiraToKana:function(str){
    return str.replace(/[\u3041-\u3096]/g, function(match) {
          var chr = match.charCodeAt(0) + 0x60;
          return String.fromCharCode(chr);
      });
  },
  sendLog: function(event, param) {
      var sendParam = {
        tab: 'JapaneseCapture',
        event: event,
      };

      if (param) {
        sendParam = $.extend(sendParam, param);
      }
      sbc(sendParam);
  },
}

/*
 * 詳細のクエリフォーマット
 */
// DBpedia
Caputure.detail.dbpedia_query = '';
Caputure.detail.dbpedia_query += 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ';
Caputure.detail.dbpedia_query += 'PREFIX dct: <http://purl.org/dc/terms/> ';
Caputure.detail.dbpedia_query += 'PREFIX dbo: <http://dbpedia.org/ontology/> ';
Caputure.detail.dbpedia_query += 'PREFIX dbr: <http://dbpedia.org/property/> ';
Caputure.detail.dbpedia_query += ' ';
Caputure.detail.dbpedia_query += 'SELECT distinct ?abstract ';
//Caputure.detail.dbpedia_query += 'FROM <http://dbpedia.org> ';
Caputure.detail.dbpedia_query += 'WHERE { ';
Caputure.detail.dbpedia_query += ' { '; // OCRで取得したキーワード検索
Caputure.detail.dbpedia_query += '  ?s a ?type ; ';
Caputure.detail.dbpedia_query += '     rdfs:label "{keyword}"@ja ; ';
Caputure.detail.dbpedia_query += '     dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") . ';
Caputure.detail.dbpedia_query += ' } UNION { '; // ローマ字検索(先頭大文字)
Caputure.detail.dbpedia_query += '  ?s a ?type ; ';
Caputure.detail.dbpedia_query += '     rdfs:label "{roman_proper}"@en ; ';
Caputure.detail.dbpedia_query += '     dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") . ';
Caputure.detail.dbpedia_query += ' } UNION { '; // ローマ字検索(全小文字)
Caputure.detail.dbpedia_query += '  ?s a ?type ; ';
Caputure.detail.dbpedia_query += '     rdfs:label "{roman_lower}"@en ; ';
Caputure.detail.dbpedia_query += '     dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") . ';
Caputure.detail.dbpedia_query += ' } UNION { '; // ローマ字検索(全大文字)
Caputure.detail.dbpedia_query += '  ?s a ?type ; ';
Caputure.detail.dbpedia_query += '     rdfs:label "{roman_upper}"@en ; ';
Caputure.detail.dbpedia_query += '     dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") . ';
Caputure.detail.dbpedia_query += ' } UNION { '; // ひらがな検索
Caputure.detail.dbpedia_query += '  ?s a ?type ; ';
Caputure.detail.dbpedia_query += '     rdfs:label "{hiragana}"@ja ; ';
Caputure.detail.dbpedia_query += '     dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") . ';
Caputure.detail.dbpedia_query += ' } UNION { '; // カタカナ検索
Caputure.detail.dbpedia_query += '  ?s a ?type ; ';
Caputure.detail.dbpedia_query += '     rdfs:label "{katakana}"@ja ; ';
Caputure.detail.dbpedia_query += '     dbo:abstract ?abstract . FILTER (lang(?abstract) = "en") . ';
Caputure.detail.dbpedia_query += ' } ';
Caputure.detail.dbpedia_query += '} ';
Caputure.detail.dbpedia_query += 'LIMIT 1 ';


// レシピ
Caputure.detail.recipe_query = '';
Caputure.detail.recipe_query += 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ';
Caputure.detail.recipe_query += 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ';
Caputure.detail.recipe_query += 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ';
Caputure.detail.recipe_query += 'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ';
Caputure.detail.recipe_query += 'PREFIX nw: <http://nw-lod.nhk.or.jp/> ';
Caputure.detail.recipe_query += 'PREFIX nw-recipe: <http://nw-lod.nhk.or.jp/recipe#> ';
Caputure.detail.recipe_query += 'select distinct ?Recipe ?r_title ?r_nutrition_value ?r_difficulty ?r_url ?r_thumbnail ?r_IngredientName ';
Caputure.detail.recipe_query += 'where ';
Caputure.detail.recipe_query += '{ ';
Caputure.detail.recipe_query += '{ ';
Caputure.detail.recipe_query += 'select distinct ?Recipe ?title ?difficulty ?url ?thumbnail ?IngredientName ';
Caputure.detail.recipe_query += 'where ';
Caputure.detail.recipe_query += '{ ';
Caputure.detail.recipe_query += '?Recipe rdf:type nw-recipe:Recipe. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:title ?title. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:title ?title_ja. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:EnglishURL ?url. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:thumbnail ?thumbnail. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:difficulty ?difficulty. ';
Caputure.detail.recipe_query += 'FILTER(lang(?title) = "en" ). ';
Caputure.detail.recipe_query += 'FILTER(lang(?difficulty) = "en" ). ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:hasIngredientRelation ?RI. ';
Caputure.detail.recipe_query += '?RI nw-recipe:hasIngredients ?Ingredient. ';
Caputure.detail.recipe_query += '?Ingredient nw-recipe:name ?IngredientName. ';
Caputure.detail.recipe_query += 'FILTER(lang(?IngredientName) = "en" ). ';
Caputure.detail.recipe_query += '?Ingredient nw-recipe:name ?IngredientName_ja. ';
//Caputure.detail.recipe_query += 'FILTER(CONTAINS(?IngredientName,"{roman_proper}") || CONTAINS(?IngredientName,"{roman_lower}") || CONTAINS(?IngredientName,"{roman_upper}")).'
Caputure.detail.recipe_query += 'FILTER(lang(?IngredientName_ja) = "ja" ). ';
Caputure.detail.recipe_query += 'FILTER(CONTAINS(?IngredientName_ja,"{word}") || CONTAINS(?title_ja,"{word}")).'
Caputure.detail.recipe_query += '} ';
Caputure.detail.recipe_query += '} ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:title ?r_title. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:EnglishURL ?r_url. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:thumbnail ?r_thumbnail. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:difficulty ?r_difficulty. ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:nutrition_value ?r_nutrition_value. ';
Caputure.detail.recipe_query += 'FILTER(lang(?r_title) = "en" ). ';
Caputure.detail.recipe_query += 'FILTER(lang(?r_difficulty) = "en" ). ';
Caputure.detail.recipe_query += '?Recipe nw-recipe:hasIngredientRelation ?r_RI. ';
Caputure.detail.recipe_query += '?r_RI nw-recipe:hasIngredients ?r_Ingredient. ';
Caputure.detail.recipe_query += '?r_Ingredient nw-recipe:name ?r_IngredientName. ';
Caputure.detail.recipe_query += 'FILTER(lang(?r_IngredientName) = "en" ). ';
Caputure.detail.recipe_query += 'FILTER(STR(?r_IngredientName) != "NULL"). ';
Caputure.detail.recipe_query += '} ';

//VOD
Caputure.detail.vod_query = '';
Caputure.detail.vod_query += 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ';
Caputure.detail.vod_query += 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ';
Caputure.detail.vod_query += 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ';
Caputure.detail.vod_query += 'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ';
Caputure.detail.vod_query += 'PREFIX nw: <http://nw-lod.nhk.or.jp/> ';
Caputure.detail.vod_query += 'PREFIX nw-recipe: <http://nw-lod.nhk.or.jp/recipe#> ';
Caputure.detail.vod_query += 'select distinct ?clip ?subtitle ?description ?img ?vod_url ';
Caputure.detail.vod_query += 'where ';
Caputure.detail.vod_query += '{ ';
Caputure.detail.vod_query += '?clip rdf:type nw:VOD. ';
Caputure.detail.vod_query += '?clip nw:subtitle ?subtitle. ';
Caputure.detail.vod_query += '?clip nw:description ?description. ';
Caputure.detail.vod_query += '?clip nw:thumbnail ?thumbnail. ';
Caputure.detail.vod_query += '?clip nw:publishDate ?publishDate. ';
Caputure.detail.vod_query += 'FILTER( {filters} ). ';
Caputure.detail.vod_query += 'BIND(year(?publishDate) as ?publishYear) ';
Caputure.detail.vod_query += 'BIND(month(?publishDate) as ?publishMonth) ';
Caputure.detail.vod_query += 'BIND(now() as ?now) ';
Caputure.detail.vod_query += 'BIND(year(?now) as ?nowYear) ';
Caputure.detail.vod_query += 'BIND(month(?now) as ?nowMonth) ';
Caputure.detail.vod_query += 'FILTER( (?publishYear >= ?nowYear) || (?publishYear >= ?nowYear-1 && ?publishMonth >= ?nowMonth) ) ';
//Caputure.detail.vod_query += 'FILTER(xsd:dateTime( concat(str(?publishDate),"+09:00") ) > now()) ';
Caputure.detail.vod_query += 'BIND(CONCAT("http://www3.nhk.or.jp",STR(?thumbnail)) as ?img) ';
Caputure.detail.vod_query += '?clip nw:id ?id. ';
Caputure.detail.vod_query += 'BIND(CONCAT("http://www3.nhk.or.jp/nhkworld/app/vod/?vid=",?id) as ?vod_url) ';
Caputure.detail.vod_query += '} ';

// レシピ
Caputure.detail.recipe_query2 = '';
Caputure.detail.recipe_query2+= 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> ';
Caputure.detail.recipe_query2+= 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ';
Caputure.detail.recipe_query2+= 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ';
Caputure.detail.recipe_query2+= 'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> ';
Caputure.detail.recipe_query2+= 'PREFIX nw: <http://nw-lod.nhk.or.jp/> ';
Caputure.detail.recipe_query2+= 'PREFIX nw-recipe: <http://nw-lod.nhk.or.jp/recipe#> ';
Caputure.detail.recipe_query2+= 'select distinct ?Recipe ?r_title ?r_nutrition_value ?r_difficulty ?r_url ?r_thumbnail ?r_IngredientName ';
Caputure.detail.recipe_query2+= 'where ';
Caputure.detail.recipe_query2+= '{ ';
Caputure.detail.recipe_query2+= '{ ';
Caputure.detail.recipe_query2+= 'select distinct ?Recipe ?title ?difficulty ?url ?thumbnail ?IngredientName ';
Caputure.detail.recipe_query2+= 'where ';
Caputure.detail.recipe_query2+= '{ ';
Caputure.detail.recipe_query2+= '?Recipe rdf:type nw-recipe:Recipe. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:title ?title. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:EnglishURL ?url. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:thumbnail ?thumbnail. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:difficulty ?difficulty. ';
Caputure.detail.recipe_query2+= 'FILTER(lang(?title) = "en" ). ';
Caputure.detail.recipe_query2+= 'FILTER(lang(?difficulty) = "en" ). ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:hasIngredientRelation ?RI. ';
Caputure.detail.recipe_query2+= '?RI nw-recipe:hasIngredients ?Ingredient. ';
Caputure.detail.recipe_query2+= '?Ingredient nw-recipe:name ?IngredientName. ';
Caputure.detail.recipe_query2+= 'FILTER(lang(?IngredientName) = "en" ). ';
Caputure.detail.recipe_query2+= 'FILTER( {filters} ). ';
Caputure.detail.recipe_query2+= '} ';
Caputure.detail.recipe_query2+= '} ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:title ?r_title. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:EnglishURL ?r_url. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:thumbnail ?r_thumbnail. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:difficulty ?r_difficulty. ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:nutrition_value ?r_nutrition_value. ';
Caputure.detail.recipe_query2+= 'FILTER(lang(?r_title) = "en" ). ';
Caputure.detail.recipe_query2+= 'FILTER(lang(?r_difficulty) = "en" ). ';
Caputure.detail.recipe_query2+= '?Recipe nw-recipe:hasIngredientRelation ?r_RI. ';
Caputure.detail.recipe_query2+= '?r_RI nw-recipe:hasIngredients ?r_Ingredient. ';
Caputure.detail.recipe_query2+= '?r_Ingredient nw-recipe:name ?r_IngredientName. ';
Caputure.detail.recipe_query2+= 'FILTER(lang(?r_IngredientName) = "en" ). ';
Caputure.detail.recipe_query2+= 'FILTER(STR(?r_IngredientName) != "NULL"). ';
Caputure.detail.recipe_query2+= '} ';
