// 百度网页版基本操作库 v1.0.0

var B = {
	// defalut_salt_md5: "b87b21d39d506bb61b5fb7725379c527",
	// obfHashAsync: function (path, salt_md5) {
	// 	var API = "http://c2.pcs.baidu.com/rest/2.0/pcs/file?method=createsuperfile&ondup=overwrite&path=";
	// 	var deferred = Promise.defer();
	// 	this.getMetaAsync(path).then(function(filemeta){
	// 		var blocklist = filemeta["block_list"];
	// 		blocklist.push(salt_md5||this.defalut_salt_md5);
	// 		$.post(API + path, {param: JSON.stringify({block_list: blocklist})}, function(data) {
	// 			deferred.resolve(JSON.parse(data));
	// 		});
	// 	});
	// 	return deferred.promise;
	// },
	createGroupInvite: function (gid) {
		var API = "/mbox/group/invite?gid=";
		var deferred = Promise.defer();
		$.get(API + gid, function(meta) {
			if (!meta.errno) deferred.resolve(meta.link);
			else deferred.reject(meta);
		});
		return deferred.promise;
	},
	getMetaAsync: function (path) {
		var API = "/api/filemetas?blocks=1&dlink=1";
		var deferred = Promise.defer();
		$.post(API, {target: JSON.stringify([path])}, function(meta) {
			if (!meta.errno) deferred.resolve(meta.info[0]);
			else deferred.reject(meta);
		});
		return deferred.promise;
	},
	getShareRecordAsync: function () {
		var API = "/share/record?order=ctime&desc=1&page=";
		var list = [];
		var deferred = Promise.defer();
		(function deep(p) {
			$.getJSON(API+p, function(data) {
				list = list.concat(data.list);
				if (data.nextpage) deep(++p);
				else deferred.resolve(list);
			});
		})(1);
		return deferred.promise;
	},
	getDirAsync: function (dirname) {
		var deferred = Promise.defer();
		var list = [];
		(function deep(p) {
			$.getJSON("/api/list?&num=200&page=" + p + "&order=name&showempty=0&dir="+encodeURI(dirname),function(file_list) {
				list = list.concat(file_list.list);
				if (file_list.list.legnth == 200) {
					deep(++p);
				} else deferred.resolve(list);
			});
		})(1);
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
	createShareAsync: function (path, pwd) {
		var API = "/share/set";
		var deferred = Promise.defer();
		if (pwd && encodeURIComponent(pwd).replace(/%../g,".").length != 4) 
			throw new Error(pwd + "is not a valid password!");
		this.getMetaAsync(path).then(function(meta){
			$.post(API, {
				fid_list: JSON.stringify([meta.fs_id]),
				schannel: 4,
				channel_list: "[]",
				pwd: pwd || "1111"
			}, function(data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	createShareByIdAsync: function (fs_id, pwd) {
		var API = "/share/set";
		var deferred = Promise.defer();
		if (pwd && encodeURIComponent(pwd).replace(/%../g,".").length != 4) 
			throw new Error(pwd + "is not a valid password!");
		$.post(API, {
			fid_list: JSON.stringify([fs_id]),
			schannel: 4,
			channel_list: "[]",
			pwd: pwd || "1111"
		}, function(data) {
			deferred.resolve(data);
		});
		return deferred.promise;
	},
	cancelShareAsync: function (shareid_list) {
		var API = "/share/cancel";
		var deferred = Promise.defer();
		$.post(API, {
			shareid_list: JSON.stringify(shareid_list)
		}, function(data) {
			deferred.resolve(data);
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
	renameFileAsync: function (path, newname) { return this.renameFileBatchAsync([{path: path, newname: newname}]); },
	// [{path, newname}]
	renameFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=rename&async=2", {filelist: JSON.stringify(filelist)}, function(task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, {filelist: JSON.stringify(filelist)}, function(data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	copyFileAsync: function (path, dest, newname) { return this.copyFileBatchAsync([{path: path, dest: dest, newname: newname}]); },
	// [{path, dest, newname}]
	copyFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=copy&async=2", {filelist: JSON.stringify(filelist)}, function(task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, {filelist: JSON.stringify(filelist)}, function(data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	moveFileAsync: function (path, dest, newname) { return this.moveFileBatchAsync([{path: path, dest: dest, newname: newname}]); },
	// [{path, dest, newname}]
	moveFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=move&async=2", {filelist: JSON.stringify(filelist)}, function(task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, {filelist: JSON.stringify(filelist)}, function(data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	deleteFileAsync: function (path) { return this.deleteFileBatchAsync([path]); },
	// [path]
	deleteFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=delete&async=2", {filelist: JSON.stringify(filelist)}, function(task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, {filelist: JSON.stringify(filelist)}, function(data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	}
};


// 百度网页版分享管理 v1.0.1

// 全局变量
var storeFile = {},
	shareFile = {},
	shared_list = {},
	baned_list = [],
	ROOT_DIR = "/!电影分类版✓1022";

function refreshStoreFiles() {
	storeFile = [];
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
	shared_list = [];
	// 获取当前分享文件的状态 如果status=1 自动取消分享
	return B.getShareRecordAsync().then(function(sharelist) {
		baned_list = [];
		sharelist.forEach(function(v) {
			if (v.fsIds.length == 1) {
				shared_list[v.fsIds[0]] = 1;
				if (v.status) {
					// if (v.status == 8) console.log(v.typicalPath + " 分享失败");// B.cancelShareAsync([v.shareId]);
					if (v.status == 1 || v.status == 8) baned_list.push(v.typicalPath);
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
		console.log(baned_list.length+" 个资源已被和谐 请换MD5补档 输入baned_list查看详情");
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
	console.log("[自动分享] 尝试创建分享中");
	(function randomCreate() {
		var arr = getRandomFile(),
			randomId = arr[0],
			randomPath = arr[1];
		B.createShareByIdAsync(randomId).then(function(data) {
			if (data.errno == 110) {
				return;
			}
			$.get(data.shorturl,function(){
				deferred.resolve();
			});
			console.log("create share", randomPath);//, data);
			randomCreate();
		});
	})();
	return deferred.promise.then(function(){
		console.log("[后台] 可输入以下指令:\n"
			+"获取列表 refreshStoreFiles().then(refreshShareFiles).then(outputMarkdown)\n"
			+"创建分享 randomCreateShareAsync()");
	});
}

function createrandomCreateTask() {
	console.log("[自动分享] 自动分享开始 结束输入 clearInterval(createrandomCreateTask.vv)\n"
		+"快速开始第一次分享输入 randomCreateShareAsync().then(refreshShareFiles)");
	return createrandomCreateTask.vv=setInterval(function() {
		randomCreateShareAsync().then(refreshShareFiles);
	}, 15*6e4);
}

function sleep(time_ms) {
	var deferred = Promise.defer();
	setTimeout(function(){ deferred.resolve(); }, time_ms);
	return deferred.promise;
}

function toMarkdown(flist,link) {
	var md = "", c_mov = 0, c_tv = 0, c_share = 0;
	var index_list = [];
	for(var i in flist) {
		index_list.push(i);
	}
	index_list = index_list.sort();
	for (var i = 0; i < index_list.length; i++) {
		var index = index_list[i], v = flist[index];
		md += "## " + index_list[i] + "\n\n";
		for (var j = 0; j < v.length; j++) {
			if (v[j]["shared"]) {
				md += "+ [" + v[j].name + "](" + v[j].shared.shortlink + ")\n";
				c_share++;
			}
			else
				md += "+ " + v[j].name + "\n";
			if (index.startsWith("8"))
				c_tv++;
			else
				c_mov++;
		};
		md += "\n";
	}
	md += "共 " + c_mov + " 部电影 " + c_tv + " 部电视剧/番剧 " + c_share + " 已链接";
	var timeStr = (function(now){return "截至"+(now.getFullYear())+"年"+(now.getMonth() + 1)+"月"+now.getDate()+"日"})(new Date());
	md = ">（" + timeStr + " 共 " + c_mov + " 部电影 " + c_tv + " 部电视剧/番剧 " + c_share + " 部已链接）\n\n" + md;
	md = "#### [__>>>点此加入百度云群组<<<__](" + link + ")\n\n" + md;
	return md;
}

function downloadRAW(data,filename) {
	var m = new Blob([data]);
	var l = URL.createObjectURL(m);
	var i = document.createElement("a"), o = document.createEvent("MouseEvent");
	i.href = l;
	i.download = filename;
	i.rel = "noreferrer";
	o.initEvent("click", !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 0, null);
	i.dispatchEvent(o);
}
function outputMarkdown() {
	// 将结果输出为 带链接的md格式
	B.createGroupInvite("2031654130988868652").then(function(link) {
		console.log(link);
		var md = toMarkdown(storeFile,link);
		downloadRAW(md, "all.md");
	});
	// TODO: 添加豆瓣API自动改名;
}
// <<MAIN>>
// 获取当前所存文件的信息
refreshStoreFiles()
// 获取当前分享文件的信息
.then(refreshShareFiles)
// 随机创建
// .then(randomCreateShareAsync)
// 刷新分享信息
// .then(refreshShareFiles)
// 输出markdown文档
.then(outputMarkdown)
// 自动分享
.then(createrandomCreateTask)

