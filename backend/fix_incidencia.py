import sqlite3

conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()

# Fix all invalid habitacion_id values in the incidencia table
c.execute("UPDATE incidencia SET habitacion_id = 33 WHERE habitacion_id NOT IN (33,34,35,36,37,38,39,40,41,42) AND habitacion_id IS NOT NULL")
conn.commit()

# Verify
c.execute('SELECT id, habitacion_id FROM incidencia')
rows = c.fetchall()
print('incidencia table after fix:')
for row in rows:
    print(row)

conn.close()
print('\nDone!')