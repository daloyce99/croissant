# from flask import Flask, abort, request
from flask import Flask, request, redirect, render_template, url_for, flash, jsonify, send_from_directory
from flask_cors import CORS
import os
import datetime
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

import psycopg2.pool

# Get database configuration from environment variables
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME', 'defaultdb')
DB_SSL_MODE = os.getenv('DB_SSL_MODE', 'prefer')

# Check if password is provided
if not DB_PASSWORD:
    raise ValueError("DB_PASSWORD environment variable is required")

# Create a connection pool with a minimum of 2 connections and
# a maximum of 5 connections
pool = psycopg2.pool.SimpleConnectionPool(
    2, 5, 
    user=DB_USER, 
    password=DB_PASSWORD,
    host=DB_HOST, 
    port=DB_PORT, 
    database=DB_NAME,
    sslmode=DB_SSL_MODE
)

# Define your connection parameters
import psycopg2

import psycopg2.extras


@app.route('/register_customer', methods=["POST"])
def register_customer():
    conn = pool.getconn()

    try:
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
      payload = request.json
      print(payload)
      cursor.execute('''
      INSERT INTO "Devices" (device_id, company, department)
      VALUES (%s, %s, %s)
      RETURNING id;
      ''', (payload['device_id'], payload['company'].replace(u'\xa0', u' '), payload['department'].replace(u'\xa0', u' ')))
      # answer_id = cursor.fetchone()[0]
      cursor.close()
      conn.commit()
    except Exception as e:
      print(e)
      conn.rollback()
      server_logs(payload['device_id'],'Customer registration',str(e) )
    finally:
      pool.putconn(conn)
    return {}

@app.route('/demo/register_customer', methods=["POST"])
def demo_register_customer():
    conn = pool.getconn()

    try:
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
      payload = request.json
      print('demo register customer')
      print(payload)
      cursor.execute('''
      INSERT INTO "DemoDevices" (device_id, company, department)
      VALUES (%s, %s, %s)
      RETURNING id;
      ''', (payload['device_id'], payload['company'].replace(u'\xa0', u' '), payload['department'].replace(u'\xa0', u' ')))
      # answer_id = cursor.fetchone()[0]
      cursor.close()
      conn.commit()
    except Exception as e:
      print(e)
      conn.rollback()
      server_logs(payload['device_id'],'Demo Customer register',str(e) )
    finally:
      pool.putconn(conn)
    return {}

@app.route('/record_data', methods=["POST"])
def record_data():
    conn = pool.getconn()

    try:
      payload = request.json
      print(payload)
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
      cursor.execute('''
      INSERT INTO "Answers" (device_id, question_id, answer)
      VALUES (%s, %s, %s)
      RETURNING id;
      ''', (payload['device_id'], payload['question_id'], payload['answer']))
      answer_id = cursor.fetchone()[0]
      cursor.close()
      conn.commit()
      print(f"Answer inserted with id: {answer_id}")
      return {}
    except Exception as e:
      print(e)
      conn.rollback()
      cursor.close()
      server_logs(payload['device_id'],'Answer recording',str(e) )
    finally:
      pool.putconn(conn)
    return {}

@app.route('/demo/record_data', methods=["POST"])
def demo_record_data():
    conn = pool.getconn()

    try:
      payload = request.json
      print('demo answer')
      print(payload)
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
      cursor.execute('''
      INSERT INTO "DemoAnswers" (device_id, question_id, answer)
      VALUES (%s, %s, %s)
      RETURNING id;
      ''', (payload['device_id'], payload['question_id'], payload['answer']))
      answer_id = cursor.fetchone()[0]
      cursor.close()
      conn.commit()
      print(f"Answer inserted with id: {answer_id}")
      return {}
    except Exception as e:
      print(e)
      conn.rollback()
      cursor.close()
      server_logs(payload['device_id'],'Demo Answer recording',str(e) )
    finally:
      pool.putconn(conn)
    return {}




@app.route('/logs/record_data', methods=["POST"])
def logs_record_data():
    conn = pool.getconn()

    try:

      

      payload = request.json
      print('logs save')
      # return print(payload)
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      cursor.execute('SELECT * FROM "Devices" where device_id=\'{}\';'.format(  #enable
        payload['device_id']
      ))

      device_data = cursor.fetchone()

      # db Logs layout rows slightly differs from Logsdemo layout
      device_id= device_data[1]
      company= device_data[2]
      department= device_data[3]
      prompt_group= device_data[5]
      prompt_id=payload['prompt_id']
      answer=payload['answer']
      recived_status=payload['recieved_status']
      error_log=payload['error_log']

      cursor.execute('''
      INSERT INTO "Logs" (device_id, company, department, prompt_group, prompt_id, answer, recived_status, error_log )
      VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
      ''', (device_id, company, department, prompt_group, prompt_id, answer, recived_status, error_log))
      # result = cursor.fetchone()
      cursor.close()
      conn.commit()
      # print(f"Logs added: {result}")
      return {}
    except Exception as e:
      print('logs add error : ',e)
      conn.rollback()
      cursor.close()
      server_logs(device_id,'App logs recording',str )
    finally:
      pool.putconn(conn)
    return {}


@app.route('/demo/logs/record_data', methods=["POST"])
def demo_logs_record_data():
    conn = pool.getconn()

    try:

      

      payload = request.json
      print('demo logs save')
      # return print(payload)
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      cursor.execute('SELECT * FROM "DemoDevices" where device_id=\'{}\';'.format(  #enable
        payload['device_id']
      ))

      device_data = cursor.fetchone()

      # return print(device_data)

      device_id= device_data[0]
      company= device_data[1]
      department= device_data[2]
      prompt_group= device_data[4]
      prompt_id=payload['prompt_id']
      answer=payload['answer']
      recived_status=payload['recieved_status']
      error_log=payload['error_log']

      cursor.execute('''
      INSERT INTO "DemoLogs" (device_id, company, department, prompt_group, prompt_id, answer, recived_status, error_log )
      VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
      ''', (device_id, company, department, prompt_group, prompt_id, answer, recived_status, error_log))
      # result = cursor.fetchone()
      cursor.close()
      conn.commit()
      # print(f"Logs added: {result}")
      return {}
    except Exception as e:
      print('logs add error : ',e)
      conn.rollback()
      cursor.close()
      server_logs(device_id,'Demo App logs recording',str(e))
    finally:
      pool.putconn(conn)
    return {}

@app.route('/logs_view', methods=["GET"])
def logs_view():
    conn = pool.getconn()

    try:
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      # cursor.execute('SELECT * FROM "Logs";')
      
      cursor.execute('SELECT * FROM "Logs" ORDER BY created_at DESC LIMIT 1000;')

      res = jsonify(cursor.fetchall())

      cursor.close()
      conn.commit()

      return res
    
    except Exception as e:
      print(e)
      conn.rollback()
      server_logs('n/a','Logs viewing function',str(e) )
    finally:
      pool.putconn(conn)
    return {}


@app.route('/demo/logs_view', methods=["GET"])
def demo_logs_view():
    conn = pool.getconn()

    try:
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      # cursor.execute('SELECT * FROM "Logs";')
      
      cursor.execute('SELECT * FROM "DemoLogs" ORDER BY created_at DESC LIMIT 1000;')

      res = jsonify(cursor.fetchall())

      cursor.close()
      conn.commit()

      return res
    
    except Exception as e:
      print(e)
      conn.rollback()
      server_logs('n/a','Demo Logs viewing function',str(e))
    finally:
      pool.putconn(conn)
    return {}

@app.route('/server_logs_view', methods=["GET"])
def server_logs_view():
    conn = pool.getconn()

    try:
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      # cursor.execute('SELECT * FROM "Logs";')
      
      cursor.execute('SELECT * FROM "ServerLogs" ORDER BY created_at DESC LIMIT 1000;')

      res = jsonify(cursor.fetchall())

      cursor.close()
      conn.commit()

      return res
    
    except Exception as e:
      print(e)
      conn.rollback()
      server_logs('n/a','Logs viewing function',str(e) )
    finally:
      pool.putconn(conn)
    return {}

@app.route('/')
def index():

  conn = pool.getconn()

  try:
    device_id = request.args.get('device_id') #enable 
    # device_id = "0ab3d6de936ff051659306cab99a95361acf8aae55bd4513c2d81319608aaae8"

    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    cursor.execute('SELECT * FROM "Devices" where device_id=\'{}\';'.format(  #enable
      device_id
    ))

    # cursor.execute('SELECT * FROM "Devices"')

    device = cursor.fetchone()

    print(device)

    if device is None:
      return { 'prompt_type': 'customer_register' }

    # Check if 'prompt_group' exists and set it to 1 if not 
    if 'prompt_group' not in device or device['prompt_group'] is None: 
      prompt_group = None
      print(f"Setting prompt_group to {prompt_group} for device_id {device_id}") 
      cursor.execute('UPDATE "Devices" SET prompt_group=%s WHERE device_id=%s;', (prompt_group, device_id)) 
      conn.commit() 
      
      # Re-fetch the device to verify the update 
      cursor.execute('SELECT * FROM "Devices" WHERE device_id=%s;', (device_id,)) 
      device = cursor.fetchone() 
      print(f"Updated device: {device}")



    cursor.execute('SELECT * FROM "Questions" where "PickerDB"=\'{}\' and department=\'{}\' and prompt_group=\'{}\';'.format(device['company'].replace(u'\xa0', u' '), device['department'].replace(u'\xa0', u' '),device['prompt_group']))  #enable



    r = cursor.fetchone()
    res = {}

    for key in r.keys():
      res[key] = r[key]
    cursor.close()
    conn.commit()
    if r is None:
      return {}
    return res
  except Exception as e:
    print(e)
    conn.rollback()
    server_logs(device_id,'Quiz popup request',str(e) )
  finally:
    pool.putconn(conn)
  return {}

@app.route('/demo')
def demo():

  conn = pool.getconn()

  print('demo ')

  try:
    device_id = request.args.get('device_id')

    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    cursor.execute('SELECT * FROM "DemoDevices" where device_id=\'{}\';'.format(
      device_id
    ))

    device = cursor.fetchone()

    if device is None:
      return { 'prompt_type': 'customer_register' }
    
        # Check if 'prompt_group' exists and set it to 1 if not 
    if 'prompt_group' not in device or device['prompt_group'] is None: 
      prompt_group = 1 
      print(f"Setting prompt_group to {prompt_group} for device_id {device_id}") 
      cursor.execute('UPDATE "DemoDevices" SET prompt_group=%s WHERE device_id=%s;', (prompt_group, device_id)) 
      conn.commit() 
      
      # Re-fetch the device to verify the update 
      cursor.execute('SELECT * FROM "DemoDevices" WHERE device_id=%s;', (device_id,)) 
      device = cursor.fetchone() 
      print(f"Updated device: {device}")

    print(device)
    print(device['company'].replace(u'\xa0', u' '), device['department'].replace(u'\xa0', u' '), str(device['call_count']),device['prompt_group'])

    cursor.execute('SELECT * FROM "DemoQuestions" where "PickerDB"=\'{}\' and department=\'{}\' and demo_occurence_no=\'{}\' and prompt_group=\'{}\';'.format(device['company'].replace(u'\xa0', u' '), device['department'].replace(u'\xa0', u' '), str(device['call_count']),device['prompt_group']))

    r = cursor.fetchone()

    print(r)
    res = {}

    for key in r.keys():
      res[key] = r[key]

    cursor.execute('''
      UPDATE "DemoDevices" set call_count = {}
      WHERE device_id=\'{}\'
      RETURNING id;
    '''.format(device['call_count'] + 1, device_id))

    cursor.fetchone()

    cursor.close()
    conn.commit()
    if r is None:
      return {}
    return res
  except Exception as e:
    print(e)
    conn.rollback()
    server_logs(device_id,'Demo Quiz popup request',str(e) )
  finally:
    pool.putconn(conn)
  return {}



@app.route('/popup_logs_check', methods=["GET"])
def popup_logs_check():
    conn = pool.getconn()

    try:

      response = {
         "show_app_window_once_more": False,
        #  "popup_allowed_time": "11,12,13,14,15,16",  # Default allowed hours
         "prompt_group_is_number": False  # Default value
        }

      device_id = request.args.get('device_id') #enable
 
      # return print(payload)
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      # --------- Check if app window should be shown once more ---------

      # db Logs layout rows slightly differs from Logsdemo layout
      date = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
      # date="2025-06-03 12:51:41.705712"

      #check if returned date value [ 2025-04-27 23:04:00.896019 ] matches [ date] ignoring time
      cursor.execute('SELECT * FROM "Logs" WHERE "device_id"=%s AND created_at::date = %s AND recived_status = %s', (device_id.replace(u'\xa0', u' '), date.split(' ')[0], 'true'))
  
      result = cursor.fetchone()

      # If no logs found for today, return True to show the app window once more
      if result is None:
        response["show_app_window_once_more"] = True

      # --------- Check if popup allowed time to display ---------
      cursor.execute('SELECT * FROM "AppConfiguration";')
      app_config_data = cursor.fetchall()
      response["app_configuration"] = [dict(row) for row in app_config_data]
      app_config_data = cursor.fetchone()
      
      # --- check if prompt_group is a number ---

      cursor.execute('SELECT * FROM "Devices" where device_id=\'{}\';'.format(  #enable
        device_id
      ))
      device_data = cursor.fetchone()
      if device_data is not None and device_data['prompt_group'] is not None:
        try:
          int(device_data['prompt_group'])
          response["prompt_group_is_number"] = True  # prompt_group is a number
        except ValueError:
          response["prompt_group_is_number"] = False
      else:
        response["prompt_group_is_number"] = False

      if response["prompt_group_is_number"] is False & response["show_app_window_once_more"] is True:
        # print('popup restricted from displaying, prompt_group is not a number')
        company= device_data['company']
        department= device_data['department']
        prompt_group= device_data['prompt_group']
        prompt_id='n/a'  # No specific prompt_id for this case
        answer='popup restricted from displaying, prompt_group is not a number'
        recived_status='true'  # Assuming the status is true since no error occurred
        error_log='n/a'

        cursor.execute('''
        INSERT INTO "Logs" (device_id, company, department, prompt_group, prompt_id, answer, recived_status, error_log )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        ''', (device_id, company, department, prompt_group, prompt_id, answer, recived_status, error_log))


      cursor.close()
      conn.commit()


    except Exception as e:
      print('popup Logs check error : ',e)
      conn.rollback()
      cursor.close()
      server_logs(device_id,'Popup alternative time to display checking',str(e) )
    finally:
      pool.putconn(conn)
    return jsonify(response)



# function that saved errors logs to the database table [ server_logs ]
def server_logs(device_id, source_details, err_log ):
    
    conn = pool.getconn()

    try:
      # print('server logs save')
      # return print(payload)
      cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

      cursor.execute('''
      INSERT INTO "ServerLogs" (device_id, source_details, error_log)
      VALUES (%s, %s, %s);
      ''', (device_id, source_details, err_log))
      # result = cursor.fetchone()
      cursor.close()
      conn.commit()
      # print(f"Logs added: {result}")
      return {}
    except Exception as e:
      print('server logs add error : ',e)
      conn.rollback()
      cursor.close()
    finally:
      pool.putconn(conn)
    return {}

# server_logs('test device_id','test source_detail','test err_log' )  # Example usage of server_logs function


# ----  updates handler -----

# app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Necessary for flashing messages

UPLOAD_FOLDER = 'my-app-updates'
ALLOWED_EXTENSIONS = {'exe', 'dmg', 'zip', 'blockmap', 'yml'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_directories():
    for platform in ['win32', 'darwin']:
        os.makedirs(os.path.join(UPLOAD_FOLDER, platform), exist_ok=True)

create_directories()  # Create directories

def decrease_version(version):
  """Decreases the last number of a version string by 1.

  Args:
    version: The version string to decrease.

  Returns:
    The decreased version string.
  """

  parts = version.split('.')
  last_number = int(parts[-1])
  decreased_last_number = last_number - 1
  parts[-1] = str(decreased_last_number)
  return '.'.join(parts)

# version = "4.6.1"
# decreased_version = decrease_version(version)
# print(decreased_version)  # Output: 4.6.0

@app.route('/my-app-updates/<path:filename>')  # Static file server route
def download_file(filename):
    try:
      return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        server_logs('n/a','App update download', str(e) )
       

@app.route('/media/<path:filename>')  # Static file server route
def send_instruction(filename):
    return send_from_directory('media', filename)

@app.route('/control')
def control():
    windows_files = []
    mac_files = []
    for (dirpath, dirnames, filenames) in os.walk(UPLOAD_FOLDER):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            if 'win32' in dirpath:
                windows_files.append((file_path, os.path.getmtime(file_path)))
            elif 'darwin' in dirpath:
                mac_files.append((file_path, os.path.getmtime(file_path)))

    # Sort files by modification time (latest first)
    windows_files.sort(key=lambda x: x[1], reverse=True)
    mac_files.sort(key=lambda x: x[1], reverse=True)

    windows_files = [file[0] for file in windows_files]
    mac_files = [file[0] for file in mac_files]

    return render_template('index.html', windows_files=windows_files, mac_files=mac_files)

@app.route('/logs')
def logs_ui():
   return render_template('logs.html')
   

@app.route('/upload', methods=['POST'])
def upload_file():
    
  try:

    if 'file' not in request.files:
        flash('No file part')
        return redirect(url_for('control'))
    
    files = request.files.getlist('file')  # Get list of all files uploaded

    # print(request.files)

    for file in files:
        if file.filename == '':
            flash('No selected file')
            continue
        
        if file and allowed_file(file.filename):
            platform = request.form.get('platform', 'unknown-platform')
            filename = file.filename.replace(' ', '-')  # Replace spaces with hyphens
            # version =  decrease_version(request.form.get('version', '1.0.0'))  # Ensure version is always set
            version =  request.form.get('version', '1.0.0') # Ensure version is always set

            folder = os.path.join(UPLOAD_FOLDER, platform, version)
            os.makedirs(folder, exist_ok=True)

            file_path = os.path.join(folder, filename)
            if os.path.exists(file_path):
                file_name, file_extension = os.path.splitext(filename)
                versioned_filename = f"{file_name}-{version}{file_extension}"
                file_path = os.path.join(folder, versioned_filename)

            print(f"Saving file: {file_path}")
            file.save(file_path)
            file_size = os.path.getsize(file_path)
            print(f"Saved file: {file_path} (size: {file_size} bytes)")

            # if filename.endswith('.exe'):
            #     release_notes = request.form.get('releaseNotes', 'No release notes')
            #     release_date = datetime.datetime.now().isoformat()
            #     url = f"https://your-server.com/uploads/{platform}/{version}/{filename}"

            #     release_info = f"{file_size} {filename} {version}\n"
            #     with open(os.path.join(UPLOAD_FOLDER, platform, version, 'RELEASES'), 'w') as f:
            #         f.write(release_info)
            #     print(f"Written RELEASES info for {filename}")

            # if filename.endswith('.yml'):
            #     yml_info = f"YML file: {file_size} {filename} {version}\n"
            #     with open(os.path.join(UPLOAD_FOLDER, platform, version, 'latest.yml'), 'w') as f:
            #         f.write(yml_info)
            #     print(f"Written latest.yml info for {filename}")

            # if filename.endswith('.blockmap'):
            #     blockmap_info = f"Blockmap file: {file_size} {filename} {version}\n"
            #     with open(os.path.join(UPLOAD_FOLDER, platform, version, 'blockmap.info'), 'w') as f:
            #         f.write(blockmap_info)
            #     print(f"Written blockmap info for {filename}")

            # if filename.endswith(('.dmg', '.zip')):
            #     release_notes = request.form.get('releaseNotes', 'No release notes')
            #     release_date = datetime.datetime.now().isoformat()
            #     url = f"https://your-server.com/uploads/{platform}/{version}/{filename}"

            #     release_info = {
            #         "releaseNotes": release_notes,
            #         "releaseDate": release_date,
            #         "url": url,
            #         "version": version
            #     }
            #     with open(os.path.join(UPLOAD_FOLDER, platform, version, 'RELEASES.json'), 'w') as f:
            #         f.write(json.dumps(release_info, indent=4))
            #     print(f"Written RELEASES.json info for {filename}")

    flash('Files have been uploaded successfully.')
    return redirect(url_for('control'))
  except Exception as e:
    server_logs('n/a','App update upload', str(e) )

# if __name__ == '__main__':
#     app.run(debug=True)

