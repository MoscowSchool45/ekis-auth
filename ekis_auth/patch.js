var DEFAULT_URL = 'https://ms45.edu.ru/ekis_auth/';
var DEFAULT_REDIRECT = "http://lk.educom.ru/forms/active.html"

var cookies = document.cookie.split(/;\s+/);

var remember_field = document.getElementById("remember");

if (remember_field) {

	// Please don't remember me
	var remember_div = remember_field.parentElement;

	remember_div.style.display = 'none';
	remember_div.style.visibility = 'hidden';
	remember_div.innerHTML = '<span style="display: block; text-align: center;"><img src="chrome-extension://'+chrome.runtime.id+'/spinner.gif" alt="Please wait" style="margin: auto; width: 64px;"/></span>';

	var username_field = document.getElementById("username");
	var password_field = document.getElementById("password");

	var form = remember_div.parentElement;

	var buttons = form.getElementsByTagName("button");

	document.body.children[0].children[0].children[0].children[1].children[0].children[0].innerHTML = "Сайт отключен от «Единой системы авторизации Департамента образования города Москвы» (что бы это не значило).";

	function show_error(text) {
		var error_message_display = document.getElementById("system-message-container");
		if (text === '') {
			error_message_display.innerHTML = "";
		} else {
			error_message_display.innerHTML = '<div id="system-message"><div class="alert alert-warning"><a class="close" data-dismiss="alert">×</a>'+
			'<h4 class="alert-heading">Предупреждение</h4><div><div class="alert-message">'+
			text+'</div></div></div></div>';
		}
	}

	var url;
	chrome.storage.sync.get("ekisAuthURL", function(items) {
		if (typeof items.ekisAuthURL !== 'undefined') {
			url = items.ekisAuthURL;
		} else {
			url = DEFAULT_URL;
		}
		console.log(url);
	})

	chrome.storage.sync.get("ekisAuthSystem", function(items) {
		if (typeof items.ekisAuthSystem !== 'undefined') {
			system = items.ekisAuthSystem;
	        document.body.children[0].children[0].children[0].children[1].children[0].children[0].innerHTML =
	        "Сайт отключен от «Единой системы авторизации Департамента образования города Москвы» (что бы это не значило) и "+
	        system+".";
		}
	})

	var redirect;
	chrome.storage.sync.get("ekisAuthRedirect", function(items) {
		if (typeof items.ekisAuthRedirect !== 'undefined') {
			redirect = items.ekisAuthRedirect;
		} else {
			redirect = DEFAULT_REDIRECT;
		}
	})

	form.addEventListener("submit", function(event) {
		event.preventDefault();

		if (typeof url === 'undefined' | typeof redirect === 'undefined') {
			return false;
		}

		show_error("");

		username_field.disabled = true;
		password_field.disabled = true;

		for (b=0; b<buttons.length; b++) {
			console.log(buttons[b])
			buttons[b].style.display = "none";
			buttons[b].style.visibility = "hidden";
		}

		remember_div.style.display = 'block';
		remember_div.style.visibility = 'visible';

		var xhr = new XMLHttpRequest();
		xhr.open('POST', url, true);
	 
		xhr.addEventListener("readystatechange", function(e){
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					var response = JSON.parse(xhr.responseText);
					chrome.runtime.sendMessage(response, function(response) {
						console.log(response);
						window.location.href = redirect;
					});
				} else {
					if (xhr.status == 403) {
						show_error("Неправильный логин или пароль.");
						console.log("Auth failed");
					} else {
						show_error("Произошла неизвестная ошибка. Попробуйте повторить попытку входа позднее.");
						console.log("Unknown error");
					}
					username_field.disabled = false;
					password_field.disabled = false;
					password_field.value = ""

					for (b=0; b<buttons.length; b++) {
						buttons[b].style.display = "block";
						buttons[b].style.visibility = "visible";
					}

					remember_div.style.display = 'none';
					remember_div.style.visibility = 'hidden';
				}
			} 
		}, false);
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
		xhr.send('username='+username_field.value+'&password='+password_field.value);
	}, false);
}

chrome.storage.sync.get("ekisAuthHidePasswords", function(items) {
    var hide_password = true;
    if (typeof items.ekisAuthHidePasswords !== 'undefined') {
        hide_password = items.ekisAuthHidePasswords;
    }
    console.log(hide_password);
    if (hide_password) {
        var menus = document.getElementsByClassName("vertical menu ui")
        if (menus.length !== 0) {
            // Try to remove "stored passwords" link
            for (m=0; m<menus.length; m++) {
                links = menus[m].getElementsByTagName("a")
                for (l=0; l<links.length; l++) {
                    if (links[l].href === 'http://lk.educom.ru/passwords.html') {
                        links[l].parentElement.removeChild(links[l]);
                    }
                }
            }
        }
    }
})