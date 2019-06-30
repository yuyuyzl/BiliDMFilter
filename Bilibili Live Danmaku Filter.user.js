// ==UserScript==
// @name         Bilibili Live Danmaku Filter
// @namespace    http://tampermonkey.net/
// @version      0.4.0
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
// @match        */BiliDMFilter/*
// ==/UserScript==

var BLDFReg;
var intervalID=-1;
var config={
    "BLDFAutoStart": true,
    "BLDFIntervalDelay": 20,
    "BLDFNeedSubBody": true,
    "BLDFRegex": "(?<=[“【]).*(?=[】”])",
    "BLDFShowDanmaku": false,
    "BLDFShowMatchedDanmakuText": true,
    "BLDFShowOtherDanmaku": false
};

(function() {
    'use strict';
    var reloadConfig=function(){
        Object.keys(config).forEach(function(key){

            //console.log(key,config[key]);
            var valuet=GM_getValue(key);
            if(valuet!=null){
                config[key]=valuet;
            }else {
                GM_setValue(key,config[key]);
            }
        });
    };
    reloadConfig();
    if(window.location.href.match(/.*live.bilibili.com.*/)) {

        setTimeout(function () {

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
                '    .SubtitleTextBodyFrame::-webkit-scrollbar {display: none;}' +
                '    </style>');
            $(".icon-left-part").append('<span data-v-b74ea690="" id="regexOn" title="开启过滤" class="icon-item icon-font icon-block" style="color: royalblue"></span>');
            $(".icon-left-part").append('<span data-v-b74ea690="" id="regexSettings" title="正则过滤设置" class="icon-item icon-font icon-config" style="color: royalblue"></span>');
            if (config.BLDFNeedSubBody) {
                $("#gift-control-vm").before('<div class="SubtitleBody"><div style="height:100%;position:relative;"><div class="SubtitleTextBodyFrame"><div class="SubtitleTextBody"></div></div></div></div>');
                $(".bilibili-live-player").append('<div class="SubtitleBody Fullscreen ui-resizable"><div style="height:100%;position:relative;"><div class="SubtitleTextBodyFrame"><div class="SubtitleTextBody"></div></div></div><div class="ui-resizable-handle ui-resizable-e" style="z-index: 90;"></div><div class="ui-resizable-handle ui-resizable-s" style="z-index: 90;"></div><div class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se" style="z-index: 90;"></div></div>');
                $(".SubtitleBody.Fullscreen").draggable();
            }
            var startInterval = function () {
                if (config.BLDFRegex == null) return;
                if (intervalID >= 0) clearInterval(intervalID);
                BLDFReg = new RegExp(config.BLDFRegex);
                intervalID = setInterval(function () {
                    $(".bilibili-danmaku").each(function (i, obj) {
                        if (!(obj.innerText[obj.innerText.length - 1] == " ")) {
                            if (!config.BLDFShowDanmaku) $(obj).addClass("invisibleDanmaku");
                            var matchres = obj.innerText.match(BLDFReg);
                            console.log(obj.innerText);
                            if (matchres != null && matchres != "") {
                                if (config.BLDFShowDanmaku) $(obj).removeClass("invisibleDanmaku");
                                //console.log(matchres);
                                $('.SubtitleTextBody').prepend("<p>" + matchres + "</p>");
                                $('.SubtitleTextBody').each(function (i, obj) {
                                    $(obj).children().each(function (i, obj) {
                                        if (i >= 6) {
                                            //obj.remove();
                                        }
                                    });
                                });
                                if (config.BLDFShowMatchedDanmakuText) obj.innerText = matchres + ' '; else obj.innerText = obj.innerText + ' ';
                            } else {
                                obj.innerText = obj.innerText + ' ';
                                if (!config.BLDFShowOtherDanmaku) $(obj).addClass("invisibleDanmaku");
                            }
                        }
                    })
                }, config.BLDFIntervalDelay);
            }
            if (config.BLDFAutoStart) startInterval();
            $("#regexSettings").click(function () {
                window.open("https://yuyuyzl.github.io/BiliDMFilter/");
            });

            $("#regexOn").click(function () {
                if (intervalID >= 0) {
                    clearInterval(intervalID);
                    $(".bilibili-danmaku").each(function (i, obj) {
                        $(obj).removeClass("invisibleDanmaku");
                    });
                    intervalID=-1;

                }
                else startInterval();
            });
        }, 3000);

    }else

    if(window.location.href.match(/.*\/BiliDMFilter\/.*/)){
        console.log(config);
        $("#BLDFSettingsSave").removeAttr("disabled");
        Object.keys(config).forEach(function(key){
            $("#"+key).removeAttr("disabled");
            console.log(typeof config[key]);
            if (typeof config[key]=="string"||typeof config[key]=="number")$("#"+key).val(config[key]);
            if (typeof config[key]=="boolean")$("#"+key).attr("checked", config[key]);
        });
        $('#BLDFSettingsSave').click(function () {
            GM_setValue("UpdateTime",new Date());
            Object.keys(config).forEach(function(key){
                if (typeof config[key]=="string")GM_setValue(key,$("#"+key).val());
                if (typeof config[key]=="number")GM_setValue(key,parseInt($("#"+key).val()));
                if (typeof config[key]=="boolean")GM_setValue(key,$("#"+key).is(':checked'));
            });
        })

    }

})();