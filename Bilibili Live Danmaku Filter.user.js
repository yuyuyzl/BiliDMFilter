// ==UserScript==
// @name         Bilibili Live Danmaku Filter
// @namespace    http://tampermonkey.net/
// @version      0.3.3
// @description  使用一个简单的定时器把弹幕按照给定的正则表达式过滤一遍，征求更好的实现方式中
// @supportURL   http://nga.178.com/read.php?tid=17690584
// @author       yuyuyzl
// @require      https://code.jquery.com/jquery-3.4.0.min.js
// @require      https://cdn.bootcss.com/jqueryui/1.12.1/jquery-ui.min.js
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_info
// @match        *://live.bilibili.com/*
// ==/UserScript==

var BLDFRegex="【.*";
var BLDFReg;
var BLDFNeedSubBody;
var BLDFAutoStart;
var BLDFShowDanmaku;
var BLDFShowMatchedDanmakuText;
var BLDFShowOtherDanmaku;
var BLDFIntervalDelay;
var intervalID=-1;
(function() {
    'use strict';
    var reloadConfig=function(){
        if((BLDFRegex=GM_getValue("BLDFRegex"))==null)BLDFRegex="(?<=[“【]).*(?=[】”])";
        GM_setValue("BLDFRegex",BLDFRegex);
        if((BLDFNeedSubBody=GM_getValue("BLDFNeedSubBody"))==null)BLDFNeedSubBody=true;
        GM_setValue("BLDFNeedSubBody",BLDFNeedSubBody);
        if((BLDFShowMatchedDanmakuText=GM_getValue("BLDFShowMatchedDanmakuText"))==null)BLDFShowMatchedDanmakuText=true;
        GM_setValue("BLDFShowMatchedDanmakuText",BLDFShowMatchedDanmakuText);
        if((BLDFShowDanmaku=GM_getValue("BLDFShowDanmaku"))==null)BLDFShowDanmaku=true;
        GM_setValue("BLDFShowDanmaku",BLDFShowDanmaku);
        if((BLDFShowOtherDanmaku=GM_getValue("BLDFShowOtherDanmaku"))==null)BLDFShowOtherDanmaku=false;
        GM_setValue("BLDFShowOtherDanmaku",BLDFShowOtherDanmaku);
        if((BLDFAutoStart=GM_getValue("BLDFAutoStart"))==null)BLDFAutoStart=false;
        GM_setValue("BLDFAutoStart",BLDFAutoStart);
        if((BLDFIntervalDelay=GM_getValue("BLDFIntervalDelay"))==null)BLDFIntervalDelay=20;
        GM_setValue("BLDFIntervalDelay",BLDFIntervalDelay);
    };
    setTimeout(function(){
        reloadConfig();
        // 以下CSS以及字幕框元素来自SOW社团的自动字幕组件
        // 发布帖链接：http://nga.178.com/read.php?tid=17180967
        $("head").append('<style type="text/css">\n' +
            '    .SubtitleBody{height:160px;background-color:rgba(0, 0, 0, 0.8);color:#fff;}\n' +
            '    .SubtitleBody.mobile{position:relative;top:5.626666666666667rem;}\n' +
            '    .SubtitleBody .title{padding:10px;font-size:14px;color:#ccc;}\n' +
            '    .SubtitleBody.mobile .title{font-size:12px;}\n' +
            '    .SubtitleBody .SubtitleTextBodyFrame{padding:0 10px;overflow-y:auto;position:absolute;top:8px;bottom:8px;}\n' +
            '    .SubtitleBody .SubtitleTextBody{min-height:110px;font-size:14px;color:#ccc;}\n' +
            '    .SubtitleBody.mobile .SubtitleTextBody{font-size:12px;}\n' +
            '    .SubtitleBody .SubtitleTextBody p{margin-block-start:5px;margin-block-end:5px;}\n' +
            '    .SubtitleBody .SubtitleTextBody p:first-of-type{color:#fff;font-size:20px;font-weight:bold;}\n' +
            '    .SubtitleBody.mobile .SubtitleTextBody p:first-of-type{font-size:18px;}\n' +
            '    .SubtitleBody.Fullscreen{position:absolute;left:20px;bottom:30px;z-index:50;background-color:rgba(0, 0, 0, 0.6);width:800px;display:none}\n' +
            '    .SubtitleBody.mobile.Fullscreen{width:300px;}\n' +
            '    .bilibili-live-player[data-player-state=fullscreen] .SubtitleBody.Fullscreen,.bilibili-live-player[data-player-state=web-fullscreen] .SubtitleBody.Fullscreen{display:block;}\n' +
            '    .bilibili-lmp-video-wrapper[data-mode=fullScreen] .SubtitleBody.Fullscreen,.bilibili-lmp-video-wrapper[data-orientation=landscape] .SubtitleBody.Fullscreen{display:block;}\n' +
            '    .invisibleDanmaku{opacity:0 !important;}\n' +
            '    .SubtitleTextBodyFrame::-webkit-scrollbar {display: none;}'+
            '    </style>');
        $(".icon-left-part").append('<span data-v-b74ea690="" id="regexSettings" title="正则屏蔽设置" class="icon-item icon-font icon-block"></span>');
        if(BLDFNeedSubBody){
            $("#gift-control-vm").before('<div class="SubtitleBody"><div style="height:100%;position:relative;"><div class="SubtitleTextBodyFrame"><div class="SubtitleTextBody"></div></div></div></div>');
            $(".bilibili-live-player").append('<div class="SubtitleBody Fullscreen ui-resizable"><div style="height:100%;position:relative;"><div class="SubtitleTextBodyFrame"><div class="SubtitleTextBody"></div></div></div><div class="ui-resizable-handle ui-resizable-e" style="z-index: 90;"></div><div class="ui-resizable-handle ui-resizable-s" style="z-index: 90;"></div><div class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se" style="z-index: 90;"></div></div>');
            $(".SubtitleBody.Fullscreen").draggable();
        }
        var startInterval=function(){
            if(BLDFRegex==null)return;
            if(intervalID>=0)clearInterval(intervalID);
            BLDFReg=new RegExp(BLDFRegex);
            intervalID=setInterval(function (){$(".bilibili-danmaku").each(function(i,obj){
                if(!(obj.innerText[obj.innerText.length-1]==" ")){
                    if(!BLDFShowDanmaku)$(obj).addClass("invisibleDanmaku");
                    var matchres=obj.innerText.match(BLDFReg);
                    console.log(obj.innerText);
                    if(matchres!=null&&matchres!=""){
                        if(BLDFShowDanmaku)$(obj).removeClass("invisibleDanmaku");
                        //console.log(matchres);
                        $('.SubtitleTextBody').prepend("<p>"+matchres+"</p>");
                        $('.SubtitleTextBody').each(function(i,obj){
                            $(obj).children().each(function(i,obj){
                                if(i>=6){
                                    //obj.remove();
                                }
                            });
                        });
                        if(BLDFShowMatchedDanmakuText)obj.innerText=matchres+' ';else obj.innerText=obj.innerText+' ';
                    }else {obj.innerText=obj.innerText+' ';if(!BLDFShowOtherDanmaku)$(obj).addClass("invisibleDanmaku");}
                }
            })},BLDFIntervalDelay);
        }
        if(BLDFAutoStart)startInterval();
        $("#regexSettings").click(function(){

            var BLDFRegexnew=prompt("输入白名单正则表达式，留空则关闭过滤",BLDFRegex);
            if(BLDFRegexnew==null)return;
            BLDFRegex=BLDFRegexnew;
            if(intervalID>=0)clearInterval(intervalID);
            BLDFReg=new RegExp(BLDFRegex);
            if(BLDFRegex!=""){
                startInterval();
                GM_setValue("BLDFRegex",BLDFRegex);
            }
        });
    },3000);


})();