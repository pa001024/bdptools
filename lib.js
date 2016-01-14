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
