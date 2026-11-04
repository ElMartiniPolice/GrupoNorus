import os, sqlite3

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.base'
import django
django.setup()

# Connect to the database directly
db_path = 'db.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Delete using raw SQL with PRAGMA
cursor.execute('PRAGMA foreign_keys=OFF')
cursor.execute('DELETE FROM habitacion')
conn.commit()
cursor.execute('PRAGMA foreign_keys=ON')

cursor.execute('SELECT COUNT(*) FROM habitacion')
count = cursor.fetchone()[0]
print('After delete: ' + str(count) + ' rows in habitacion')

conn.close()