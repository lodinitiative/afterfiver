function sbc(dataObject){
	g_bc.send(dataObject);
}

var g_bc={
	CONFIG:{
		HOST:'/bc/', //loggerのパス
		DIR:'iswcapp',//PorjectName
		WITH_TIME:true,//時間打刻するか
		CONSOLE:true,//console.logもするか
		TIME_FORMAT:'YYYY-MM-DD hh:mm:ss:lll',//時間打刻する場合のフォーマット
		DEBUG:true//デバッグモード。falseにするとログ送信しない
	},
	send:function(dataObject){
		var _this=this;
		if(_this.CONFIG.CONSOLE){
			if(typeof console!='undefined'){
				console.log(dataObject);
			}
		}
		if(!_this.CONFIG.DEBUG)return;
		var i=new Image();
		var time=(_this.CONFIG.WITH_TIME)?(_this.datefmt(_this.CONFIG.TIME_FORMAT,new Date())):'';
		dataObject.time=time;
		i.src = _this.CONFIG.HOST
			+ encodeURI( _this.CONFIG.DIR ) + '/'
			+ encodeURI( JSON.stringify(dataObject) ) + '/'
			+ 'x.gif';
	},
	zeroPad:function(s,l){
		s=s.toString();
		while(s.length<l){s='0'+s;}
		return s;
	},
	datefmt:function(fmt, d){
		var t={};
		t.Y = fmt.match(/Y+/);
		if(t.Y)fmt = fmt.replace( /Y+/g, d.getFullYear().toString().slice(4-t.Y[0].length) );
		t.M = fmt.match(/M+/);
		if(t.M)fmt = fmt.replace( /M+/g, this.zeroPad(d.getMonth()+1, t.M[0].length) );
		t.D = fmt.match(/D+/);
		if(t.D)fmt = fmt.replace( /D+/g, this.zeroPad(d.getDate(), t.D[0].length) );
		fmt = fmt.replace( /a+/g, this.yobi[d.getDay()] );
		var hh=d.getHours();
		var hf=((hh-12)>=0)?1:0;
		fmt = fmt.replace( /A+/g, Array('AM','PM')[hf] );
		fmt = fmt.replace( /G+/g, Array('午前','午後')[hf] );
		t.h = fmt.match(/h+/);
		if(t.h)fmt = fmt.replace( /h+/g, this.zeroPad(hh, t.h[0].length) );
		t.n = fmt.match(/n+/);
		if(t.n)fmt = fmt.replace( /n+/g, this.zeroPad( Array(hh,hh-12)[hf], t.n[0].length) );
		t.m = fmt.match(/m+/);
		if(t.m)fmt = fmt.replace( /m+/g, this.zeroPad(d.getMinutes(), t.m[0].length) );
		t.s = fmt.match(/s+/);
		if(t.s)fmt = fmt.replace( /s+/g, this.zeroPad(d.getSeconds(), t.s[0].length) );
		t.l = fmt.match(/l+/);
		if(t.l)fmt = fmt.replace( /l+/g, this.zeroPad(d.getMilliseconds(), t.l[0].length) );
		fmt = fmt.replace( /K+/g, this.tukiE[d.getMonth()] );
		fmt = fmt.replace( /k+/g, this.tukiE[d.getMonth()].substring(0,3) );
		fmt = fmt.replace( /X+/g, this.yobiE[d.getDay()] );
		fmt = fmt.replace( /x+/g, this.yobiE[d.getDay()].substring(0,3) );
		return fmt;
	},
	yobi:'日 月 火 水 木 金 土'.split(' '),
	yobiE:'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(' '),
	tukiE:'January February March April May June July August September October November December'.split(' ')
};
