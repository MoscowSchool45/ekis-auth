import datetime
import bottle
import requests
import ldap3
import json
import argparse
from bs4 import BeautifulSoup
import os

default_config_file = os.path.join(os.path.split(os.path.realpath(__file__))[0], "config.json")

# Configuration

parser = argparse.ArgumentParser(description='EKIS-auth server.')
parser.add_argument('--config', nargs='?', help='config.json path', default=default_config_file)

args = parser.parse_args()

with open(args.config) as c:
    config = json.load(c)

def get_config(key, default=None):
    if key in config:
        return config[key]
    elif default is None:
        print("Warning: config key {} is unset.".format(key))
        return None
    else:
        return default

ekis_url = get_config('ekis_ur', 'http://lk.educom.ru')
ekis_username = get_config('ekis_username')
ekis_password = get_config('ekis_password')

ldap_servers = get_config('ldap_servers')
if ldap_servers is None: 
    print("Can't operate without any LDAP servers.")
    exit(1)

serverPool = ldap3.ServerPool()
for server in ldap_servers:
    current_server = ldap3.Server(server['host'], port=server['port'], use_ssl=server['ssl'])
    serverPool.add(current_server)

ldap_additional_filter = get_config('ldap_filter', 'objectClass=*')
ldap_login_attribute = get_config('ldap_login_attribute','cn')
ldap_scope_string = get_config('ldap_scope', 'subtree')

string_to_scope = {
    'subtree': ldap3.SUBTREE,
    'base': ldap3.BASE,
    'level': ldap3.LEVEL
}

log_file = get_config('log_filename', 'fact.txt')

ldap_scope = string_to_scope[ldap_scope_string.lower()]

log_path = get_config('log_file_path', 'fact.txt')
                             
# Configuration ends

def registry(text, success):
    last_time = datetime.datetime.now()
    f=open(log_path, 'a')
    if success:
      a = str('Авторизвция прошла успешно')  #do something
    else:
      a = str('Неверный логин или пароль')  #do something else
   
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
