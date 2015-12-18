// 百度网页版转存后直链下载 v1.0.1

var B = {
	getMetaAsync: function (path) {
		var API = "/api/filemetas?blocks=1&dlink=1";
		var deferred = Promise.defer();
		$.post(API, {target: JSON.stringify([path])}, function(meta) {
			if (!meta.errno) deferred.resolve(meta.info[0]);
			else deferred.reject(meta);
		});
		return deferred.promise;
	},
	transferFileAsync: function (shareid, from, filename, path) {
		var API = "/share/transfer";
		var deferred = Promise.defer();
		$.post(API + "?shareid="+shareid+"&from="+from, {
			filelist: JSON.stringify(["/"+filename]),
			path: path
		}, function(data) {
			deferred.resolve(data);
		});
		return deferred.promise;
	},
	createDirAsync: function (path) {
		var API = "/api/create?a=commit";
		var deferred = Promise.defer();
		$.post(API, {
			path: "/"+path,
			isdir: 1,
			size: "",
			block_list: "[]",
			method: "post"
		}, function(meta) {
			if (!meta.errno) deferred.resolve(meta);
			else deferred.reject(meta);
		});
		return deferred.promise;
	},
};

!function hellobcs() {
	if (typeof yunData != "object") return alert("Σ(⊙▽⊙\"a...当前不是分享页面或者页面加载不正确\n请刷新页面再试哦");
	if (!yunData.MYUK) return alert("_(￣0￣)_~ 请登录后再进行操作");
	var r = require("disk-system:widget/system/uiService/tip/tip.js");
	function info(a,b) {
		r.show({
			mode: a?"success":"caution",
			msg: b,
			autoClose: !1
		});
	}
	// 外链
	if (yunData.FILENAME) {
		var path = "/tmp";
		function step2_display(name, link) {
			var a = downFileButton || document.createElement("a");
			a.rel = "noreferrer";
			a.download = name;
			a.href = link;
			info(1,'直链转化成功 点击下载按钮或右键复制链接到下载工具进行下载');
		}
		function step1_transfer() {
			B.transferFileAsync(yunData.SHARE_ID, yunData.SHARE_UK, yunData.PATH, path).then(function(d) {
				return B.getMetaAsync(path+"/"+yunData.FILENAME)
			},function(){info(0,"Σ(⊙▽⊙|||... 未知错误");}).then(function(d) {
				step2_display(d.server_filename, d.dlink);
			},function(){info(0,"Σ(⊙▽⊙|||... 未知错误");});
		}
		B.getMetaAsync("/tmp").then(step1_transfer, function(d) {
			if (d.info[0].errno == -9)
				B.createDirAsync("/tmp").then(step1_transfer);
			else info(0,"Σ(⊙▽⊙|||... 未知错误");
		});
	}
	// 文件管理
	else {
		var path = unescape(decodeURI(location.hash)).replace(/^(?:#list\/path=\/?)?/,"/");
		var filename = $(".item-active:first .filename").attr("title");
		if (!filename) return info(0,"~~ -______-\" 请选中文件");
		if ($(".item-active:first").data("extname") == "dir") return info(0,"不支持文件夹");

		B.getMetaAsync(path+"/"+filename).then(function(d) {
			info(1,'直链转化成功 <a rel="noreferrer" download="'+filename+'" href="'+d.dlink+'">点击下载</a>(或复制到下载工具)');
		}, function(d) {
			info(0,'直链转化失败 errno='+d.errno);
		});
	}
}();