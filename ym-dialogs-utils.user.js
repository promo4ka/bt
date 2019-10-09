// ==UserScript==
// @name         Плюшки для диалогов
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Всякие плюшки для диалогов
// @author       i_mrz
// @match        https://vk.com/*
// @grant        none
// @license    MIT
// @updateURL https://openuserjs.org/meta/promo4ka/Плюшки_для_диалогов.meta.js
// @downloadURL https://openuserjs.org/install/promo4ka/Плюшки_для_диалогов.user.js
// @copyright 2019, promo4ka (https://openuserjs.org/users/promo4ka)
// ==/UserScript==

/**
 * - Сделать все сообщения прочитанными
 * -
 */

(function() {
	'use strict';

	const executeReadDialogs =  `
		var dialogs = API.messages.getConversations({ count: 24, filter: "unread" });
		var i = 0;
		while (i < dialogs.items.length) {
			API.messages.markAsRead({ peer_id: dialogs.items[i].conversation.peer.id });
			i = i + 1;
		}
		return i;
	`;

	const styles = `
		.ym-menu {
			position: fixed; right: 20px; top: 100px; width: 28px; height: 28px; border-radius: 28px;
			opacity: .2; background: url(https://sun1.dataix-by-minsk.userapi.com/c623619/v623619208/56b89/ROWwg-PMTrQ.jpg) center center / cover;
			box-shadow: inset 0 0 0 1px rgb(106, 152, 204); display: inline-block; margin: 0px 1px -1px 2px;
			outline-offset: -1px; cursor: pointer; transition: .3s ease-in;
		}
		.ym-menu:hover { opacity: 1 }
		.ym-menu:hover > .ym-items { visibility: visible; opacity: 1; }
		.ym-items {
			position: absolute; width: 200px; top: 10px; left: -203px; background: #e8dada;
			color: #a84a4a; border-radius: 10px 0 10px 10px; overflow: hidden; opacity: 0;
			visibility: collapse; transition:visibility 0.3s ease-in, opacity 0.3s ease;
		}
		.ym-items ul { padding: 0; margin: 0; list-style: none; overflow: auto; max-height: 300px; }
		.ym-bt-products ul li:last-child { border: none; text-overflow: ellipsis; overflow: hidden; }
		.ym-items li { padding: 10px 20px; }
		.ym-items li:hover { background: #841010; color: #fff; }
	`;

	window.ymReadAllDialogs = () => {
		ymApi('execute', {
			code: executeReadDialogs
		}).then((r) => {
			showDoneBox('Все диалоги помечены как прочитанные.');
		}).catch((e) => {
			showDoneBox('Не удалось, чудеса случаются.');
			if (window.location.hash === '#debug') {
				console.log('error', e);
			}
		})
	}

	const itemList = `
		<li onclick="ymReadAllDialogs()">Прочитать все</li>
	`;

	const initReadDialogs = () => {
		const ymMenu = document.createElement('div');
			ymMenu.className = 'ym-menu';

		const ymItems = document.createElement('div');
			ymItems.className = 'ym-items';

		const ymItemList = document.createElement('div');
			ymItemList.innerHTML = `<ul>${itemList}</ul>`;

		ymItems.append(ymItemList);
		ymMenu.append(ymItems);

		document.body.append(ymMenu);
	}

	window.addEventListener("load", () => {
		init();

		if(typeof ymApi !== "function") {
			window.ymApi = (method, data = {}) => {
				return new Promise((resolve, reject) => {
					const xhr = new XMLHttpRequest();

					xhr.open('GET', 'https://vk.com/dev/execute', true);
					xhr.onreadystatechange = () => {
						if (xhr.readyState != 4) return;

						const hash = xhr.responseText.match(/Dev\.methodRun\(\'([a-z0-9\:]+)/im);
						if(!hash) { return reject("Invalid hash"); }

						var _data = new FormData();
						_data.append("act", "a_run_method");
						_data.append("al", 1);
						_data.append("hash", hash[1]);
						_data.append("method", "execute");
						_data.append("param_code", (method == "execute") ? data.code : `return API.${method}(${JSON.stringify(data)});`);
						_data.append("param_v","5.101");

						if(method == "execute") {
							for(var name in data) {
								_data.append(`param_${name}`, data[name]);
							}
						}

						const req = new XMLHttpRequest();
						req.open('POST', 'https://vk.com/dev', true);
						req.onreadystatechange = () => {
							if (req.readyState != 4) return;

							if(xhr.status !== 200) { return reject("I/O Error", xhr.status); }

							var _response = req.response;
							try {
								_response = JSON.parse(req.response.replace(/^.+?\{/,"{"));
								_response = JSON.parse(_response.payload[1]);
							} catch(e) {}

							if(_response.response) {
								resolve(_response);
							} else if(_response.error && _response.error.error_code == 6) {
								API(method, data).then(resolve, reject);
							} else {
								reject(_response);
							}
						};

						req.send(_data);
					};
					xhr.send();
				});
			};
		}
	});

	const init = () => {
		const style = document.createElement('style');
			style.innerHTML = styles;

		document.head.append(style);

		initReadDialogs();
	}

	console.info('init: ym-dialogs-utils');
})();