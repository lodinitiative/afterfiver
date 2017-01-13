<?php
	getUUID();
function getUUID(){
	$ckey='_loguuid';
	if(isset($_COOKIE[$ckey]) && $_COOKIE[$ckey]!==''){
		$ck = $_COOKIE[$ckey];
	}
	else{
		$ck = uniqid( md5($_SERVER['HTTP_USER_AGENT']).".", true );
	}
	$expire = time()+60*60*24*30;
	$path = '/';
	setcookie($ckey, $ck, $expire, $path);
	return $ck;
}
