<?php
	$request_uri = $_SERVER['REQUEST_URI'];
	$ua = $_SERVER['HTTP_USER_AGENT'];
	$access_time = date("Y-m-d H:i:s");
	$access_date = date("Ymd");
	$access_file = preg_match('/[^\?]+\.(gif|js|html|txt)$/',$request_uri,$match);
	$resource_path='./resource/';
	switch($match[1]){
		case 'gif':
			header('Content-type: image/gif;');
			echo file_get_contents($resource_path.'bc.gif');
			break;
		case 'js':
			header('Access-Control-Allow-Origin: *');
			header('Content-type: application/javascript;');
			echo file_get_contents($resource_path.'bc.js');
			break;
		case 'html':
			header('Access-Control-Allow-Origin: *');
			header('Content-type: text/html;');
			echo file_get_contents($resource_path.'bc.html');
			break;
		case 'txt':
		default:
			header('Access-Control-Allow-Origin: *');
			header('Content-type: text/plain;');
			echo file_get_contents($resource_path.'bc.txt');
			break;
	}

	// LogFormat
	$logs = array(
		$access_time,
		getUUID(),
		$_SERVER['REMOTE_ADDR'],
		gethostbyaddr($_SERVER['REMOTE_ADDR']),
		$request_uri,
		$ua,
	);
	
	file_put_contents('./logs/'.$access_date.'.log', implode("\t",$logs)."\n", FILE_APPEND);

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
?>