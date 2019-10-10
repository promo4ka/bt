// ==UserScript==
// @name         Баг-трекер плюшки
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Меню с избранными продуктами на весь сайт
// @author       i_mrz
// @match        https://vk.com/*
// @grant        none
// @license    MIT
// @updateURL https://openuserjs.org/meta/promo4ka/Баг-трекер_плюшки.meta.js
// @downloadURL https://openuserjs.org/install/promo4ka/Баг-трекер_плюшки.user.js
// @copyright 2019, promo4ka (https://openuserjs.org/users/promo4ka)
// ==/UserScript==

(function() {
	'use strict';

	const settings = {
		showCountOpenedReports: false // Показывать ли количество открытых отчетов
	};

	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.target.getAttribute('id') !== "wrap3") return;
			initBTUtils();
		});
	});

	const formatNumber = (number) => {
		if (number === null) { return 0; }

		return `${number}`.replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
	};

	const styles = `
			.ym-bt-menu {
				position: fixed; right: 20px; top: 60px; width: 28px; height: 28px; border-radius: 28px;
				opacity: .2; background: url(https://pp.userapi.com/c639625/v639625391/42408/zj0kpTaIKiI.jpg) center center / cover;
				box-shadow: inset 0 0 0 1px rgb(106, 152, 204); display: inline-block; margin: 0px 1px -1px 2px;
				outline-offset: -1px; cursor: pointer; transition: .3s ease-in; z-index: 999999999;
			}
			.ym-bt-menu:hover { opacity: 1 }
			.ym-bt-menu:hover > .ym-bt-products { visibility: visible; opacity: 1; }
			.ym-bt-products {
				position: absolute; width: 200px; top: 10px; left: -203px; background: #dae1e8;
				color: #4a76a8; border-radius: 10px 0 10px 10px; overflow: hidden; opacity: 0;
				visibility: collapse; transition:visibility 0.3s ease-in, opacity 0.3s ease;
			}
			.ym-bt-products a { text-decoration: none; }
			.ym-bt-products ul { padding: 0; margin: 0; list-style: none; overflow: auto; max-height: 300px; }
			.ym-bt-products li { padding: 10px 20px; border-bottom: 1px solid #b9cada; }
			.ym-bt-products ul a:last-child li { border: none; text-overflow: ellipsis; overflow: hidden; }
			.ym-bt-products li:hover { background: #105284; color: #fff; }
			.bt_product_row .bt_product_row_photo .ym_btn {
				position: absolute; width: 18px; height: 18px; font-size: 16px; bottom: 1px;
				right: 5px; background: #215e98; color: #fff; border-radius: 50%;
				text-align: center; cursor: pointer; border: 1px solid #519bd6;
			}
		`;

	const getProducts = () => {
		const jsonProducts = localStorage.getItem('ymBtProducts');
		const products = jsonProducts ? JSON.parse(jsonProducts) : [];

		return products;
	}

	const getCountOpenedReports = async (product_id) => {
		return await new Promise((resolve, reject) => {
			var _data = new FormData();
			_data.append("load", 1);
			_data.append("al", 1);
			_data.append("original", 1);
			_data.append("product", product_id);
			_data.append("status", 0);
			_data.append("wishes", 1);

			const req = new XMLHttpRequest();
			req.open('POST', 'https://vk.com/bugs', true);
			req.onreadystatechange = () => {
				if (req.readyState != 4) return;

				if(req.status !== 200) { return reject("I/O Error", req.status); }

				let _response = req.response;
				try {
					_response = JSON.parse(req.response.replace(/^.+?\{/,"{"));
					_response = _response.payload[1];
				} catch(e) {}

				let count = false;
				if (_response[0]) {
					const response = _response[0].replace('Склеить отчёты', '');
					const left = `${response}`.indexOf("Найден");
					const right = `${response}`.indexOf("отчёт")+5;
					const center = `${response}`.slice(left, right);
					count = center.split(" ")[1] || 0;
				}

				if(count !== false) {
					resolve(count);
				} else if(_response.error && _response.error.error_code == 6) {
					getCountOpenedReports(product_id).then(resolve, reject);
				} else {
					reject(_response);
				}
			};

			req.send(_data);
		});
	}

	const initMenu = () => {
		const products = getProducts();
		const productList = products.map((item, index) => {
			const opened = settings.showCountOpenedReports ? ` (${item.count})` : '';
			return `<a href="${item.link}"><li>${item.name}${opened}</li></a>`
		}).join('');

		if (productList) {
			const btOldMenu = document.querySelector('.ym-bt-menu');
			if (btOldMenu) btOldMenu.remove();

			const btMenu = document.createElement('div');
				btMenu.className = 'ym-bt-menu';

			const btProducts = document.createElement('div');
				btProducts.className = 'ym-bt-products';
				
			const btProductItems = document.createElement('div');
				btProductItems.innerHTML = `<ul>${productList}</ul>`;

			btProducts.append(btProductItems);
			btMenu.append(btProducts);

			document.body.append(btMenu);
		}
	}

	const initBTUtils = () => {
		const btProductRows = document.querySelectorAll('.bt_product_row');

		if (btProductRows) {
			const products = getProducts();

			const allYmBtn = document.querySelectorAll('.ym_btn');

			if (allYmBtn) {
				allYmBtn.forEach((btn) => btn.remove());
			}

			btProductRows.forEach((row) => {
				const pId = row.getAttribute('id').split('_')[2];
				const ymBtn = document.createElement('div');
					ymBtn.className = 'ym_btn';
					ymBtn.innerHTML = products.find(p => pId === p.id) ? '-' : '+';

				const rowPhoto = row.querySelector('.bt_product_row_photo');
				rowPhoto.append(ymBtn);
			});

			observer.observe(document.body, { childList: true, subtree: true });
		}
	}

	const updateProducts = (add = false) => {
		if (!settings.showCountOpenedReports) return;

		const products = getProducts();
		const lastUpdate = localStorage.getItem('ymLastUpdate');
		const timestamp = Math.round(+new Date()/1000);

		if (!lastUpdate || (lastUpdate+3600) < timestamp || add) {
			products.forEach((item, index) => {
				getCountOpenedReports(item.id).then((r) => {
					const updateProducts = getProducts();
					updateProducts[index].count = formatNumber(r);

					localStorage.setItem('ymBtProducts', JSON.stringify(updateProducts));

					if (index === products.length-1) {
						setTimeout(initMenu, 333);
					}
				})
			});

			localStorage.setItem('ymLastUpdate', timestamp);
		}
	}

	document.addEventListener('click', function(event) {
		const element = event.target;

		if (element.className === 'ym_btn') {
			const row = element.closest('.bt_product_row');
			const link = row.querySelector('.bt_prod_link');
			const pId = row.getAttribute('id').split('_')[2];
			const pName = link.innerText;
			const pLink = link.getAttribute('href');
			const products = getProducts();

			if (element.innerText === '+') {
				element.innerText = '-';
				products.push({
					id: pId,
					name: pName,
					link: pLink,
					count: 0
				});
			} else {
				element.innerText = '+';
				if (products.find(p => pId === p.id)) {
					products.splice(products.map(p => +p.id).indexOf(+pId), 1);
				}
			}

			localStorage.setItem('ymBtProducts', JSON.stringify(products));
			updateProducts(true);
			initMenu();
		}
	});

	const init = () => {
		const style = document.createElement('style');
			style.innerHTML = styles;

		document.head.append(style);

		updateProducts();
		initBTUtils();
		initMenu();
	}

	init();
	// window.addEventListener("load", init);

})();

/**
 * LOG CHANGES
 * v1.3 - Добавлен вывод количества открытых отчетов
 */