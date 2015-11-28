// 百度网页版转存后直链下载 v1.0.0

function hellobcs() {
	if (typeof yunData != "object") return alert("Σ(⊙▽⊙\"a...当前不是分享页面或者页面加载不正确\n请刷新页面再试哦");
	if (!yunData.MYUK) return alert("_(￣0￣)_~ 请登录后再进行操作");
	var r = require("common:widget/toast/toast.js");
	function info(a,b) {
		r.obtain.useToast({
			toastMode: a?r.obtain.MODE_SUCCESS:r.obtain.MODE_FAILURE,
			msg: b,
			sticky: !0,
			position: 4096,
			closeType: !0
		});
	}

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
			B.transferFileAsync(yunData.SHARE_ID, yunData.SHARE_UK, yunData.FILENAME, path).then(function(d) {
				return B.getMetaAsync(path+"/"+yunData.FILENAME)
			}).then(function(d) {
				step2_display(d.server_filename, d.dlink);
			});
		}
		B.getMetaAsync("/tmp").then(step1_transfer, function(d) {
			if (d.info[0].errno == -9)
				B.createDirAsync("/tmp").then(step1_transfer);
			else info(0,"Σ(⊙▽⊙|||... 未知错误");
		});
	} else {
		var path = unescape(decodeURI(decodeURI(location.hash))).replace(/^(?:#path=\/?)?/,"/");
		var filename = $(".item-active:first .name").attr("title");
		if (!filename) return info(0,"~~ -______-\" 请选中文件");
		if ($(".item-active:first").data("extname") == "dir") return info(0,"不支持文件夹");

		B.getMetaAsync(path+"/"+filename).then(function(d) {
			info(1,'直链转化成功 <a rel="noreferrer" download="'+filename+'" href="'+d.dlink+'">点击下载</a>(或复制到下载工具)');
		}, function(d) {
			info(0,'直链转化失败 errno='+d.errno);
		});
	}
}
hellobcs();