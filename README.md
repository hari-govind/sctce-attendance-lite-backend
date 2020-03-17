# SCTCE Unofficial Attendance App Lite Backend
ExpressJS Backend for SCTCE Attendance App Lite. It does scraping, processing and serves results in JSON. 
## API Endpoints
### /login
POST urlencoded `username` and `password`. The API will return true if the given username and password is valid and false if not.
### /attendance
POST urlencoded `username` and `password`. Will return a JSON object, having student name and register number along with attendance details.
## Other Colleges
This backend can be hosted and used as an unofficial stateless API to etlab college attendance website.
If your college uses etlab and you would like to use this, feel free to fork it and change the url to your college's etlab portal.
## License
This project is licensed under AGPL-3.0
