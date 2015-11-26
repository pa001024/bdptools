// 百度网页版分享管理 v1.0.0

// 全局变量
var storeFile = {},
	shareFile = {},
	shared_list = {},
	ROOT_DIR = "/!电影分类版✓983";

function refreshStoreFiles() {
	return B.getDirAsync(ROOT_DIR).then(function(file_list) {
		var rename_list = [];
		var tasks = [];
		file_list.forEach(function(dobj) {
			var d_name = dobj.server_filename;
			if (dobj.isdir && !d_name.match(/^(?:#|!|XX)/)) {
				var r_list = [];
				tasks.push(B.getDirAsync(dobj.path).then(function(f_list) {
					f_list.forEach(function(fobj) {
						if (fobj.server_filename.startsWith("["))
							r_list.push({fs_id:fobj.fs_id,path:fobj.path,name:fobj.server_filename});
					});
					var new_d_name = d_name.replace(/✓\d+?$/g, "✓" + r_list.length);
					if (new_d_name != d_name) {
						console.log("rename", dobj.path, "to", new_d_name);
						rename_list.push({ path: dobj.path, newname: new_d_name });
					}
					storeFile[new_d_name] = r_list;
				}));
			}
		});
		return Promise.all(tasks).then(function() {
			return B.renameFileBatchAsync(rename_list);
		});
	})
}

function refreshShareFiles() {
	// 获取当前分享文件的状态 如果status=1 自动取消分享
	return B.getShareRecordAsync().then(function(sharelist) {
		sharelist.forEach(function(v) {
			if (v.fsIds.length == 1) {
				shared_list[v.fsIds[0]] = 1;
				if (v.status) {
					if (v.status == 1) B.cancelShareAsync([v.shareId]);
					if (v.status == 8) console.log(v.typicalPath + " 已被和谐 请用MD5补档");
				} else shareFile[v.fsIds[0]] = v;
			}
		});
		var tasks = [];
		for(var i in storeFile) {
			storeFile[i].forEach(function(fileInfo) {
				if (shareFile[fileInfo.fs_id+""]) {
					fileInfo["shared"] = shareFile[ fileInfo.fs_id+"" ];
				}
			});
		}
		return Promise.all(tasks);
	}); 
}

function getAvaliableList() {
	var avaliable_list = [],
		id_path_map = {};
	for(var i in storeFile) storeFile[i].forEach(function(fileInfo) {
		var id = fileInfo.fs_id+"";
		if (!shared_list[id]) {
			avaliable_list.push(id);
			id_path_map[id] = fileInfo.path;
		}
	});
	return [avaliable_list, id_path_map];
}

function getRandomList() {
	var arr = getAvaliableList(),
		avaliable_list = arr[0],
		id_path_map = arr[1];
	return function(){
		var random_index = ~~(Math.random()*avaliable_list.length);
		avaliable_list[0] = avaliable_list[random_index] + (avaliable_list[random_index] = avaliable_list[0], "");
		var randomId = avaliable_list.shift();
		return [randomId, id_path_map[randomId]];
	}
}

function getDirectLink(_path) {
	var path = _path || getRandomList()()[1];
	B.getMetaAsync(path).then(function(d) {
		console.log(path, d.dlink);
	});
}


function randomCreateShareAsync() {
	var deferred = Promise.defer();
	var getRandomFile = getRandomList();
	(function randomCreate() {
		var arr = getRandomFile(),
			randomId = arr[0],
			randomPath = arr[1];
		B.createShareByIdAsync(randomId).then(function(data) {
			if (data.errno == 110) {
				deferred.resolve();
				return;
			}
			console.log("create share", randomPath, data);
			randomCreate();
		});
	})();
	return deferred.promise;
}

function sleep(time_ms) {
	var deferred = Promise.defer();
	setTimeout(function(){ deferred.resolve(); }, time_ms);
	return deferred.promise;
}

function toMarkdown(flist) {
	var md = "", c_mov = 0, c_tv = 0;
	var index_list = [];
	for(var i in flist) {
		index_list.push(i);
	}
	index_list = index_list.sort();
	for (var i = 0; i < index_list.length; i++) {
		var index = index_list[i], v = flist[index];
		md += "## " + index_list[i] + "\n\n";
		for (var j = 0; j < v.length; j++) {
			if (v[j]["shared"])
				md += "+ [" + v[j].name + "](" + v[j].shared.shortlink + ")\n";
			else
				md += "+ " + v[j].name + "\n";
			if (index.startsWith("8"))
				c_tv++;
			else
				c_mov++;
		};
		md += "\n";
	}
	md += "共 " + c_mov + " 部电影 " + c_tv + " 部电视剧/番剧";
	return md;
}

function downloadRAW(data,filename) {
	var m = new Blob([data]);
	var l = URL.createObjectURL(m);
	var i = document.createElement("a"), o = document.createEvent("MouseEvent");
	i.href = l;
	i.download = filename;
	o.initEvent("click", !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 0, null);
	i.dispatchEvent(o);
}


// <<MAIN>>
// 获取当前所存文件的信息
refreshStoreFiles()
// 获取当前分享文件的信息
.then(function() { return refreshShareFiles(); })
// 随机创建
// .then(function() { return randomCreateShareAsync(); })
// 刷新分享信息
// .then(function() { return refreshShareFiles(); })
// 输出markdown文档
.then(function() {
	// 将结果输出为 带链接的md格式
	var md = toMarkdown(storeFile);
	downloadRAW(md, "all.md");
	// TODO: 添加豆瓣API自动改名;
});