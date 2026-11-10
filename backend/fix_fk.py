import sqlite3

conn = sqlite3.connect('db.sqlite3')
cursor = conn.cursor()

# Check current cambio_estado_habitacion rows with their habitacion_id
cursor.execute('SELECT id, habitacion_id, estado_anterior, estado_nuevo FROM cambio_estado_habitacion')
rows = cursor.fetchall()
print('Current cambio_estado_habitacion:')
for row in rows:
    print(row)

# habitacion IDs are 33-42, let's map the existing cambio rows to valid IDs
# The rows with habitacion_id 2 and 3 need to be updated
# Let's update habitacion_id 2 -> 33, habitacion_id 3 -> 34
cursor.execute("UPDATE cambio_estado_habitacion SET habitacion_id = 33 WHERE habitacion_id = 2")
cursor.execute("UPDATE cambio_estado_habitacion SET habitacion_id = 34 WHERE habitacion_id = 3")
conn.commit()

# Verify the update
cursor.execute('SELECT id, habitacion_id FROM cambio_estado_habitacion')
updated_rows = cursor.fetchall()
print('\nAfter update:')
for row in updated_rows:
    print(row)

conn.close()
print('\nDone!')