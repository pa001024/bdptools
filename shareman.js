// 百度网页版基本操作库 v1.1.0

window.B = {
	createGroupInvite: function (gid) {
		var API = "/mbox/group/invite?gid=";
		var deferred = Promise.defer();
		$.get(API + gid, function (meta) {
			if (!meta.errno) deferred.resolve(meta.link);
			else deferred.reject(meta);
		});
		return deferred.promise;
	},
	getMetaAsync: function (path) {
		var API = "/api/filemetas?blocks=1&dlink=1";
		var deferred = Promise.defer();
		$.post(API, { target: JSON.stringify([path]) }, function (meta) {
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
			$.getJSON(API + p, function (data) {
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
			$.getJSON("/api/list?&num=200&page=" + p + "&order=name&showempty=0&dir=" + encodeURI(dirname), function (file_list) {
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
			path: "/" + path,
			isdir: 1,
			size: "",
			block_list: "[]",
			method: "post"
		}, function (meta) {
			if (!meta.errno) deferred.resolve(meta);
			else deferred.reject(meta);
		});
		return deferred.promise;
	},
	createShareAsync: function (path, pwd, hide) {
		var _this = this;
		return this.getMetaAsync(path).then(function (meta) {
			return _this.createShareByIdAsync(meta.fs_id, pwd, hide);
		});
	},
	createShareByIdAsync: function (fs_id, pwd, hide) {
		var API = hide ? "/share/pset" : "/share/set";
		var deferred = Promise.defer();
		if (pwd && encodeURIComponent(pwd).replace(/%../g, ".").length != 4)
			throw new Error(pwd + "is not a valid password!");
		$.post(API, {
			fid_list: JSON.stringify([fs_id]),
			schannel: pwd ? 4 : 0,
			channel_list: "[]",
			pwd: pwd
		}, function (data) {
			deferred.resolve(data);
		});
		return deferred.promise;
	},
	cancelShareAsync: function (shareid_list) {
		var API = "/share/cancel";
		var deferred = Promise.defer();
		$.post(API, {
			shareid_list: JSON.stringify(shareid_list)
		}, function (data) {
			deferred.resolve(data);
		});
		return deferred.promise;
	},
	transferFileAsync: function (shareid, from, filename, path) {
		var API = "/share/transfer";
		var deferred = Promise.defer();
		$.post(API + "?shareid=" + shareid + "&from=" + from, {
			filelist: JSON.stringify([(filename.startsWith("/") ? "" : "/") + filename]),
			path: path
		}, function (data) {
			deferred.resolve(data);
		});
		return deferred.promise;
	},
	renameFileAsync: function (path, newname) { return this.renameFileBatchAsync([{ path: path, newname: newname }]); },
	// [{path, newname}]
	renameFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=rename&async=2", { filelist: JSON.stringify(filelist) }, function (task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, { filelist: JSON.stringify(filelist) }, function (data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	copyFileAsync: function (path, dest, newname) { return this.copyFileBatchAsync([{ path: path, dest: dest, newname: newname }]); },
	// [{path, dest, newname}]
	copyFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=copy&async=2", { filelist: JSON.stringify(filelist) }, function (task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, { filelist: JSON.stringify(filelist) }, function (data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	moveFileAsync: function (path, dest, newname) { return this.moveFileBatchAsync([{ path: path, dest: dest, newname: newname }]); },
	// [{path, dest, newname}]
	moveFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=move&async=2", { filelist: JSON.stringify(filelist) }, function (task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, { filelist: JSON.stringify(filelist) }, function (data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	},
	deleteFileAsync: function (path) { return this.deleteFileBatchAsync([path]); },
	// [path]
	deleteFileBatchAsync: function (filelist) {
		var deferred = Promise.defer();
		$.post("/api/filemanager?opera=delete&async=2", { filelist: JSON.stringify(filelist) }, function (task_info) {
			$.post("/share/taskquery?&taskid=" + task_info.taskid, { filelist: JSON.stringify(filelist) }, function (data) {
				deferred.resolve(data);
			});
		});
		return deferred.promise;
	}
};

// 百度网页版分享管理 v1.1.0

// 全局变量
var storeFile = {},
	shareFile = {},
	shared_list = {},
	baned_list = [],
	ROOT_DIR = "/!电影分类版✓1666";

function refreshStoreFiles() {
	storeFile = {};
	return B.getDirAsync(ROOT_DIR).then(function (file_list) {
		var rename_list = [];
		var tasks = [];
		file_list.forEach(function (dobj) {
			var d_name = dobj.server_filename;
			if (dobj.isdir && !d_name.match(/^(?:#|!|XX)/)) {
				var r_list = [];
				tasks.push(B.getDirAsync(dobj.path).then(function (f_list) {
					f_list.forEach(function (fobj) {
						if (fobj.server_filename.startsWith("["))
							r_list.push({ fs_id: fobj.fs_id, path: fobj.path, name: fobj.server_filename });
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
		return Promise.all(tasks).then(function () {
			return B.renameFileBatchAsync(rename_list);
		});
	})
}
function refreshShareFiles() {
	shared_list = {};
	// 获取当前分享文件的状态 如果status=1 自动取消分享
	return B.getShareRecordAsync().then(function (sharelist) {
		baned_list = [];
		sharelist.forEach(function (v) {
			if (v.fsIds.length == 1) {
				shared_list[v.fsIds[0]] = 1;
				if (v.status) {
					if ((v.status == 1 || v.status == 8) && v.typicalPath.startsWith("/!电影")) baned_list.push(v);
				} else shareFile[v.fsIds[0]] = v;
			}
		});
		var tasks = [];
		for (var i in storeFile) {
			storeFile[i].forEach(function (fileInfo) {
				if (shareFile[fileInfo.fs_id + ""]) {
					fileInfo["shared"] = shareFile[fileInfo.fs_id + ""];
				}
			});
		}
		return Promise.all(tasks);
	});
}
function renameAllFucked() {
	var deferred = Promise.defer();
	var i = 0;
	var omg = baned_list.filter(function (a) { return a.typicalPath.split("/").pop().match(/\.(?:mkv|avi|mp4|rmvb)$/) });
	(function fuck() {
		var block = omg.slice(i * 30, (++i) * 30);
		if (!block.length) return deferred.resolve();
		var rnlist = block.reduce(function (a, b) {
			a.push({ path: b.typicalPath, newname: b.typicalPath.split("/").pop() + ".防吞" });
			console.log(b.typicalPath.split("/").pop());
			return a;
		}, []);
		B.renameFileBatchAsync(rnlist).then(fuck, function () { --i; fuck() });
	})();
	return deferred.promise;
}
function cancelAllFucked() {
	var deferred = Promise.defer();
	var i = 0;
	var omg = baned_list.filter(function (a) { return true });
	(function fuck() {
		var block = omg.slice(i * 30, (++i) * 30);
		if (!block.length) return deferred.resolve();
		var cclist = block.reduce(function (a, b) {
			a.push(b.shareId);
			console.log(b.typicalPath.split("/").pop());
			return a
		}, []);
		B.cancelShareAsync(cclist).then(fuck, function () { --i; fuck() });
	})();
	return deferred.promise;
}
function getAvaliableList() {
	var avaliable_list = [],
		id_path_map = {};
	for (var i in storeFile) storeFile[i].forEach(function (fileInfo) {
		var id = fileInfo.fs_id + "";
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
	return function () {
		if (!avaliable_list.length) return null;
		var random_index = ~~(Math.random() * avaliable_list.length);
		avaliable_list[0] = avaliable_list[random_index] + (avaliable_list[random_index] = avaliable_list[0], "");
		var randomId = avaliable_list.shift();
		return [randomId, id_path_map[randomId]];
	}
}
function getDirectLink(_path) {
	var path = _path || getRandomList()()[1];
	B.getMetaAsync(path).then(function (d) {
		console.log(path, d.dlink);
	});
}
function randomCreateShareAsync() {
	var deferred = Promise.defer();
	var getRandomFile = getRandomList();
	var created = 0;
	console.log("[自动分享] 尝试创建分享中");
	(function randomCreate() {
		var randomFile = getRandomFile();
		if (!randomFile) {
			console.log("[自动分享] 无文件需要分享");
			return deferred.resolve();
		}
		var randomId = randomFile[0],
			randomPath = randomFile[1];
		B.createShareByIdAsync(randomId).then(function (data) {
			if (data.errno == 110) {
				if (created) usage();
				return deferred.resolve();
			}
			if (data.shorturl) {
				// 访问外链检查河蟹
				$.get(data.shorturl, function (data) {
					if (data.match('<title>百度云 网盘-链接不存在</title>'))
						console.log("[failed] " + randomPath)
					else console.log("[success] " + randomPath);
				});
			} else console.log("[failed] " + randomPath);
			//, data);
			++created;
			if (created >= 7) return deferred.resolve(); // 加速
			randomCreate();
		});
	})();
	return deferred.promise;
}
function usage() {
	var timeStr = (function (now) {
		return (now.getMonth() + 1) + "-" + now.getDate() + " "
			+ now.getHours() + ":" + (now.getMinutes() + 100 + "").substr(1);
	})(new Date());
	console.log("[后台] 可输入以下指令:\n"
		+ "获取md getmd() 更新列表 getall() 创建分享 cc() 开始定时 rcstart() 结束定时 rcstop()\n"
		+ baned_list.length + " 个资源已被和谐 请换MD5补档 输入baned_list查看详情\n"
		+ " - " + timeStr);
}
function createrandomCreateTask() {
	console.log("[自动分享] 自动分享开始 结束输入 rcstop()");
	return createrandomCreateTask.vv = setInterval(function () {
		randomCreateShareAsync().then(refreshShareFiles);
	}, 11 * 6e4);// 15min
}
function sleep(time_ms) {
	var deferred = Promise.defer();
	setTimeout(function () { deferred.resolve(); }, time_ms);
	return deferred.promise;
}
function toMarkdown(flist, link) {
	var md = "#### [__>>>点此加入百度云群组<<<__](" + link + ")\n\n", c_mov = 0, c_tv = 0, c_share = 0;
	var index_list = [];
	for (var i in flist) {
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
			else md += "+ " + v[j].name + "\n";
			if (index.startsWith("8")) c_tv++; else c_mov++;
		};
		md += "\n";
	}
	var stat = "共 " + c_mov + " 部电影 " + c_tv + " 部电视剧/番剧 " + c_share + " 已链接 链接覆盖率 " + ~~(c_share / (c_mov + c_tv) * 1e3) / 10 + "%";
	md += stat;
	var timeStr = (function (now) {
		return "截至" + (now.getFullYear()) + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日"
			+ now.getHours() + "时" + (now.getMinutes() + 100 + "").substr(1) + "分";
	})(new Date());
	md = ">" + timeStr + "\n>\n> " + stat + "\n\n" + md;
	console.log(stat);
	return md;
}
function toShortMarkdown(flist, link) {
	var md = "#### [__>>>点此加入百度云群组<<<__](" + link + ")\n\n", c_mov = 0, c_tv = 0, c_share = 0;
	var index_list = [];
	for (var i in flist) {
		index_list.push(i);
	}
	index_list = index_list.sort();
	for (var i = 0; i < index_list.length; i++) {
		var index = index_list[i], v = flist[index];
		md += "## " + index_list[i] + "\n\n";
		for (var j = 0; j < v.length; j++) {
			var film = v[j].name.match(/^\[\d\.\d.*?\].+\.(?:S0?1-\d{1,2}\.)?\d{4}(?:-\d{4}|\.\d{1,2})?(?=\.|$|-)/);
			if (film) md += "+ " + film[0] + "\n";
			if (v[j]["shared"]) c_share++;
			if (index.startsWith("8")) c_tv++; else c_mov++;
		}
		md += "\n";
	}
	var stat = "共 " + c_mov + " 部电影 " + c_tv + " 部电视剧/番剧 " + c_share + " 已链接 链接覆盖率 " + ~~(c_share / (c_mov + c_tv) * 1e3) / 10 + "%";
	md += stat;
	var timeStr = (function (now) {
		return "截至" + (now.getFullYear()) + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日"
			+ now.getHours() + "时" + (now.getMinutes() + 100 + "").substr(1) + "分";
	})(new Date());
	md = ">（" + timeStr + "\n\n " + stat + "）\n\n" + md;
	console.log(stat);
	return md;
}
function downloadRAW(data, filename) {
	var m = new Blob([data]);
	var l = URL.createObjectURL(m);
	var i = document.createElement("a"), o = document.createEvent("MouseEvent");
	i.href = l;
	i.download = filename;
	i.rel = "noreferrer";
	o.initEvent("click", !0, !0, window, 1, 0, 0, 0, 0, !1, !1, !1, !1, 0, null);
	i.dispatchEvent(o);
}
function outputMarkdown(isShort) {
	// 将结果输出为 带链接的md格式
	return B.createGroupInvite("2031654130988868652").then(function (link) {
		console.log(link);
		var md = (isShort == true ? toShortMarkdown : toMarkdown)(storeFile, link);
		downloadRAW(md, (isShort == true ? "short.md" : "all.md"));
	});
	// TODO: 添加豆瓣API自动改名;
}

// 自动正则改名文件夹下文件
function regexRenameDir(dirname, regex, repl, follow, regex_dir, repl_dir) {
	var deferred = Promise.defer();
	B.getDirAsync(dirname).then(function (file_list) {
		var proc_list = [];
		var rename_list = [];
		var tasks = [];
		file_list.forEach(function (dobj) {
			if (follow) {
				var d_name = dobj.server_filename;
				if (dobj.isdir) {
					var r_list = [];
					tasks.push(B.getDirAsync(dobj.path).then(function (f_list) {
						f_list.forEach(function (fobj) {
							var finfo = { fs_id: fobj.fs_id, path: fobj.path, name: fobj.server_filename };
							var new_f_name = finfo.name.replace(regex, repl);
							if (new_f_name != finfo.name) {
								console.log("rename", finfo.name, "to", new_f_name);
								rename_list.push({ path: finfo.path, newname: new_f_name });
								finfo.name = new_f_name;
							}
							r_list.push(finfo);
						});
						var new_d_name = regex_dir ? d_name.replace(regex_dir, repl_dir) : d_name;
						if (new_d_name != d_name) {
							console.log("rename", dobj.path, "to", new_d_name);
							rename_list.push({ path: dobj.path, newname: new_d_name });
						}
						proc_list[new_d_name] = r_list; // 保存文件信息
					}));
				}
			} else {
				var finfo = { fs_id: dobj.fs_id, path: dobj.path, name: dobj.server_filename };
				var new_f_name = finfo.name.replace(regex, repl);
				if (new_f_name != finfo.name) {
					console.log("rename", finfo.name, "to", new_f_name);
					rename_list.push({ path: finfo.path, newname: new_f_name });
					finfo.name = new_f_name;
				}
			}
		});
		return Promise.all(tasks).then(function () {
			return B.renameFileBatchAsync(rename_list).then(function () {
				deferred.resolve(proc_list);
			});
		}, function () { console.log("failed") });
	});
	return deferred.promise;
} rn = regexRenameDir; // alias
// <<MAIN>>
// 获取当前所存文件的信息
refreshStoreFiles()
// 获取当前分享文件的信息
	.then(refreshShareFiles)
// 随机创建
	.then(randomCreateShareAsync)
// 刷新分享信息
	.then(refreshShareFiles)
// 输出markdown文档
	.then(outputMarkdown)
// 自动分享
// .then(createrandomCreateTask)
	.then(function () { console.log("done"); usage() })


// 手动指令
// 获取md
function md() { outputMarkdown().then(function () { console.log("done") }) }
// 获取shortmd
function smd() { outputMarkdown(!0).then(function () { console.log("done") }) }
// 获取md
function getmd() { refreshStoreFiles().then(refreshShareFiles).then(outputMarkdown).then(function () { console.log("done") }) }
// 更新列表
function getall() { refreshStoreFiles().then(refreshShareFiles).then(function () { console.log("done") }) }
// 创建分享
function cc() { randomCreateShareAsync().then(refreshShareFiles).then(function () { console.log("done") }) }
// 开始定时
function rcstart() { createrandomCreateTask() }
// 结束定时
function rcstop() { clearInterval(createrandomCreateTask.vv); console.log("已取消定时任务") }
// 帮助
var help = "获取md() getmd() smd() 更新列表 getall() 创建分享 cc() 开始定时 rcstart() 结束定时 rcstop()";
console.log(help);