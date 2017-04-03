chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		for (var c=0; c<request.data.length; c++) {
			chrome.cookies.set({ url: "http://lk.educom.ru/", name: request.data[c].name, value: request.data[c].value });
			console.log(request.data[c].name, request.data[c].value);
		}
		sendResponse({okay: true});
	}
);