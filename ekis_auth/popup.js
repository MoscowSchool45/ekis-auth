var DEFAULT_URL = 'https://ms45.edu.ru/ekis_auth/';
var DEFAULT_REDIRECT = "http://lk.educom.ru/forms/active.html";

document.addEventListener('DOMContentLoaded', function() {
  var settings_url = document.getElementById("settings_url");
  var settings_form = document.getElementById("settings_form");

  var username_field = document.getElementById("login_username");
  var password_field = document.getElementById("login_password");
  var login_form = document.getElementById("login_form");

  var spinner_img = document.getElementById("spinner_img");
  spinner_img.src = 'chrome-extension://'+chrome.runtime.id+'/spinner.gif'

  var login_do_button = document.getElementById("login_do");

  chrome.storage.sync.get("ekisAuthURL", function(items) {
    if (typeof items.ekisAuthURL !== 'undefined') {
      url = items.ekisAuthURL;
    } else {
      url = DEFAULT_URL;
    }
    settings_url.value = url;
  })

  function show_error(text) {
    var error_message_display = document.getElementById("system-message-container");
    if (text === '') {
      error_message_display.innerHTML = "";
    } else {
      error_message_display.innerHTML = '<div><h4 class="alert-heading">Предупреждение</h4><div class="alert-message">'+
      text+'</div></div>';
    }
  }

  settings_form.addEventListener("submit", function(event) {
    if (settings_url.value === "") {
      event.preventDefault();
    } else {
      chrome.storage.sync.set({"ekisAuthURL": settings_url.value});
      var xhr = new XMLHttpRequest();
      xhr.open('GET', settings_url.value, true);
      xhr.addEventListener("readystatechange", function(e){
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            chrome.storage.sync.set({"ekisAuthRedirect": response.data.redirect});
            chrome.storage.sync.set({"ekisAuthHidePasswords": response.data.hide_saved_passwords});
            chrome.storage.sync.set({"ekisAuthSystem": response.data.system});
            window.location.reload(false);
          }
        }
      }, false);
      xhr.send()
      event.preventDefault();
    }
  }, false);

  login_form.addEventListener("submit", function(event) {
    console.log("!")
    event.preventDefault();
    if ((username_field.value !== "") && (password_field.value !== "")) {
      username_field.disabled = true;
      password_field.disabled = true;
      spinner_img.style.display = 'block';
      login_do_button.style.visibility = 'hidden';
      show_error("");

      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
     
      xhr.addEventListener("readystatechange", function(e){
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            var response = JSON.parse(xhr.responseText);
            chrome.runtime.sendMessage(response, function(response) {
              console.log(response);
              	chrome.storage.sync.get("ekisAuthRedirect", function(items) {
                    if (typeof items.ekisAuthRedirect !== 'undefined') {
                        chrome.tabs.create({ url: items.ekisAuthRedirect });
                    } else {
                        chrome.tabs.create({ url: DEFAULT_REDIRECT });
                    }
                })
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

            spinner_img.style.display = 'none';
            login_do_button.style.visibility = 'visible';
          }
        } 
      }, false);
      xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
      xhr.send('username='+username_field.value+'&password='+password_field.value);
    };
  }, false);


});
