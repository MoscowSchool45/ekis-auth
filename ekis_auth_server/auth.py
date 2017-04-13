import datetime
import bottle
import requests
import ldap3
from bs4 import BeautifulSoup

# Configuration
ekis_url = 'http://lk.educom.ru'    # Default: 'http://lk.educom.ru'
ekis_username = 'changeme'
ekis_password = 'secret'

server1 = ldap3.Server('ldap1.example.com', port=636, use_ssl=True)
server2 = ldap3.Server('ldap2.example.com', port=636, use_ssl=True)
serverPool = ldap3.ServerPool()
serverPool.add(server1)
serverPool.add(server2)

ldap_additional_filter = 'objectClass=*' # Default: 'objectClass=*'
ldap_login_attribute = 'cn'                           # Default: 'cn'
ldap_scope = ldap3.SUBTREE

# Configuration ends

def registry(text, success):
    last_time = datetime.datetime.now()
    f=open('fact.txt', 'a')
    if success:
      a = str('Авторизвция прошла успешно')  #do something
    else:
      a = str('Ошибка данных')  #do something else
   
    f.write(text + " " + str(last_time) + " " + a + "\n")
    f.close()

def get_dn(cn):
    """Serches for a user DN using login name"""
    connection = ldap3.Connection(serverPool, auto_bind=True)   # No real point in reusing connections in this simple app
    connection.search(
        'T=EDU',
        '(&({}={})({}))'.format(ldap_login_attribute, cn, ldap_additional_filter),
        search_scope = ldap_scope,
        attributes=None
    )
    r = connection.response
    if len(r) == 0:
        return ''
    else:
        return r[0]['dn']

def check_password(cn, password):
    """Tries to authenticate, returns True if successful"""
    dn = get_dn(cn)
    if dn == '':
    	return False
    try:
        testConnection = ldap3.Connection(serverPool, user=dn, password=password, auto_bind=True)
    except ldap3.core.exceptions.LDAPBindError:
        return False
    return True

@bottle.get('/')
def index():
    """Returns error message, since no password or username is not provided through GET"""
    bottle.abort(403, "Wrong username or password.")

@bottle.post('/')
def index_post():
    """Checks username and password, authenticate to EKIS and send cookies"""
    cn = bottle.request.forms.get('username')
    password = bottle.request.forms.get('password')

    success = check_password(cn, password)
    registry(cn, success)
    if not success: 
     
    	bottle.abort(403, "Wrong username or password.")
     
    # Get session cookie
    r = requests.get('http://lk.educom.ru/login.html')
    cookies = r.cookies

    # Extract authentication form
    soup = BeautifulSoup(r.text, 'html.parser')
    forms = soup.find_all("form")

    if len(forms) != 1:
        return ""

    form = forms[0] # No id or anything, we have to hope this is the only form out there

    login_url = "{}{}".format(ekis_url, form['action'])
    
    fields = form.find_all("input")

    data = {}

    # Use all the default values
    for i in fields:
    	data[i['name']] = i['value']

    # Override authenticatino info
    data['username'] = ekis_username
    data['password'] = ekis_password

    # Prevent 'remembering' this session
    del data['remember']

    # Authenticate our session
    r = requests.post(login_url, cookies=cookies, data=data)

    # Dump all cookies
    result = []
    for cookie in cookies:
    	result.append( {'name': cookie.name, 'value': cookie.value} )

    # Return JSON
    return {'data': result}

# For use with WSGI
app = bottle.default_app()
application = app

# For standalone
if __name__ == '__main__':
    bottle.run()
