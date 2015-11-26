// 百度网页版转存后直链下载 v1.0.0

(function() {
	if (typeof yunData != "object") return alert("Σ(⊙▽⊙\"a...当前不是分享页面或者页面加载不正确\n请刷新页面再试哦");
	if (!yunData.MYUK) return alert("_(￣0￣)_~ 请登录后再进行操作");
	var path = "/tmp";
	function step2_display(name, link) {
		var a = downFileButton || document.createElement("a");
		a.rel = "noreferrer";
		a.download = name;
		a.href = link;
	}
	function step1_transfer() {
		B.transferFileAsync(yunData.SHARE_ID, yunData.SHARE_UK, yunData.FILENAME, path).then(function(d) {
			B.getMetaAsync(path+"/"+yunData.FILENAME).then(function(d) {
				step2_display(d.server_filename, d.dlink);
			});
		});
	}
	B.getMetaAsync("/tmp").then(step1_transfer, function(d) {
		if (d.info[0].errno == -9)
			B.createDirAsync("/tmp").then(step1_transfer);
	});
})()