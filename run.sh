# Create the logs directory and set the owner to postgres. Don't complain if the directory already exists.
mkdir logs/ 2> /dev/null
chown postgres logs

docker compose up --build
