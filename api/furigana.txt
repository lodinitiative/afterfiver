<?php
$url = "http://jlp.yahooapis.jp/FuriganaService/V1/furigana";
$appid = "dj0zaiZpPTAzN0pBNVM3RExRZSZzPWNvbnN1bWVyc2VjcmV0Jng9NGE-";
$sentence = "";

if($_SERVER["REQUEST_METHOD"] == "GET"){
    $sentence = $_GET["sentence"];
}else{
    $sentence = $_POST["sentence"];
}

$params = array('appid'=>$appid,'sentence'=>$sentence);
$context = stream_context_create(array(
        'http' => array('ignore_errors' => true)
));
$res = file_get_contents($url . "?" . http_build_query($params), false, $context);

header("Content-Type: application/xml; charset=utf-8");
echo $res;
?>