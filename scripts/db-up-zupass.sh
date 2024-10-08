#!/bin/bash
PORT=${1:-5432}
if ! [[ $PORT =~ ^[0-9]+$ && $PORT -gt 0 ]]; then
  echo "Error: $PORT is not a port number." >&2
  exit 1
fi


# Get a list of all listening port numbers
ports=$(sudo lsof -i -P -n | grep LISTEN | awk '{print $(NF - 1)}' | awk -F':' '{print $NF}')

# Convert the list into an array
port_array=($ports)

# Print the list of ports
for port in "${port_array[@]}"; do
  if [[ $PORT -eq $port ]]; then 
    echo "Error: $PORT is taken." >&2
    exit 1
  fi
done

ENV_FILE="./apps/passport-server/.env"

# Check if .env file exists
if [[ ! -f $ENV_FILE ]]; then
  echo "Error: $ENV_FILE does not exist." >&2
  exit 1
fi

# Update DATABASE_PORT in the .env file or add it if it doesn't exist
if grep -q "^DATABASE_PORT=" "$ENV_FILE"; then
  # Update the existing DATABASE_PORT line
  sed -i '' "s/^DATABASE_PORT=.*/DATABASE_PORT=$PORT/" "$ENV_FILE"
  echo "Updated DATABASE_PORT to $PORT in $ENV_FILE."
else
  # Add DATABASE_PORT to the .env file
  echo "DATABASE_PORT=$PORT" >> "$ENV_FILE"
  echo "Added DATABASE_PORT=$PORT to $ENV_FILE."
fi

pg_ctl -D apps/passport-server/local-db-data -l apps/passport-server/local-db-log -o "-p $PORT" start
