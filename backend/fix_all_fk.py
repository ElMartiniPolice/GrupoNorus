import sqlite3

conn = sqlite3.connect('db.sqlite3')
c = conn.cursor()

# Get all valid habitacion IDs
c.execute("SELECT id FROM habitacion")
valid_ids = set(row[0] for row in c.fetchall())
print(f"Valid habitacion IDs: {valid_ids}")

# Fix incidencia table (already done, but let's verify)
c.execute("UPDATE incidencia SET habitacion_id = 33 WHERE habitacion_id NOT IN valid_ids AND habitacion_id IS NOT NULL")
# Actually, let me just fix all tables that reference habitacion

# List all tables that have habitacion_id foreign key
tables_to_fix = ['cambio_estado_habitacion', 'incidencia', 'asignacion_tarea']

for table in tables_to_fix:
    print(f"\nFixing {table}...")
    # Get all rows with habitacion_id
    c.execute(f"SELECT id, habitacion_id FROM {table} WHERE habitacion_id IS NOT NULL")
    rows = c.fetchall()
    print(f"  Rows with habitacion_id: {len(rows)}")
    
    updated = 0
    for row_id, hab_id in rows:
        if hab_id not in valid_ids:
            c.execute(f"UPDATE {table} SET habitacion_id = 33 WHERE id = {row_id}")
            updated += 1
    
    conn.commit()
    print(f"  Updated {updated} rows")

# Final verification
print("\n\nFinal verification:")
for table in tables_to_fix:
    c.execute(f"SELECT id, habitacion_id FROM {table} WHERE habitacion_id IS NOT NULL")
    rows = c.fetchall()
    print(f"{table}: {rows}")

conn.close()
print("\nDone!")