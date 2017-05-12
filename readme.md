# EKIS authorization: chrome extension and server-side python wsgi app

This is a google chrome extension and server script providing separate username+password credentials for single http://lk.educom.ru school account. LDAP server is used by the server to authenticate client. If the credentials are good, server requests a session from http://lk.educom.ru and sends session cookies to the client. The extention then sets those http-only cookies using chrome API.

## Konwn issues / TODOs

- Always says it's connected to Moscow School 45 auth, even if it is connected elsewhere

- One could still see EKIS full password in http://lk.educom.ru/passwords.html (this link is hidden, but that is kind of not secure) AND in every link to a table at http://st.educom.ru (since it has login:password@ perfix). Still have to think of something to fix this one.
