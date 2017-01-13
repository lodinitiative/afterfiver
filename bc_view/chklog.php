<?php

if(isset($_GET["ymd"]) && !is_nan($_GET["ymd"])){
 $ymd=$_GET["ymd"];
}
else{
 $ymd=date("Ymd");
}

$log = file('../bc/logs/'.$ymd.'.log');
$cnt=0;
$max=10;
if(isset($_GET["max"]) && !is_nan($_GET["max"])){
 $max=$_GET["max"];
}
$s='';
if(isset($_GET["s"])){
 $s=$_GET["s"];
}

for($i=count($log)-1; $i>=0; $i--){
 if( strpos($log[$i], ' /bc_view/') !== false || strpos($log[$i], ' /favicon.ico ')!==false){
  continue;
 }
 if($s!=''){
  if( strpos($log[$i], $s) ){
   print $log[$i];
   $cnt++;
  }
 }
 else{
  print $log[$i];
  $cnt++;
 }
 if($cnt>=$max)break;
}
?>

