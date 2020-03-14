const fetch = require('node-fetch');
const cheerio = require('cheerio');

url = 'https://sctce.etlab.in/user/login';
test = 'http://localhost:8000/testurl';


/**
 * TODO
 * IMPORTANT. HARDCODED YEAR->SEMESTER VALUE MAPPING FOR TEMPERORY USE.
 * TO BE REPLACED WITH APPROPRIATE DYNAMIC FUNCTION LATER. Will not work for year back students.
 * 
 */

 const SEM_VALUE = {'16':'8', '17':'','18':'4','19':'2'}

function getAuthorizationCookie(registerNumber, password) {
    return new Promise((resolve, reject) => {
        fetch(url,
            {
                method: 'POST',
                headers: {
                    Connection: 'keep-alive',
                    Host: 'sctce.etlab.in',
                    Origin: 'https://sctce.etlab.in',
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Referer: 'https://sctce.etlab.in/user/login',
                    'Upgrade-Insecure-Requests': '1',
                },
                body: `LoginForm%5Busername%5D=${registerNumber}&LoginForm%5Bpassword%5D=${password}&yt0=`,
                redirect: 'manual'

            })
            .then((response) => {
                let cookie = response.headers.get('set-cookie').split(';')[0];
                resolve(cookie);
            })
            .catch(error => reject(error))
    })
}

function getAttendanceHTML(registerNumber, password) {
    url = 'https://sctce.etlab.in/user/login';
    return new Promise((resolve, reject) => {
        getAuthorizationCookie(registerNumber, password)
            .then((cookie) => {
                year = registerNumber.substr(0,2);
                let sem_id = SEM_VALUE[year];
                fetch(`https://sctce.etlab.in/student/results?sem_id=${sem_id}`, {
                    method: 'GET',
                    headers: {
                        Host: 'sctce.etlab.in',
                        Cookie: cookie
                    }
                })
                    .then((result) => {
                        return result.text();
                    })
                    .then(attendancePage => {
                        let $ = cheerio.load(attendancePage);
                        return $(".widget-box:nth-child(5) .widget-content > div:nth-child(3)").html();
                    })
                    .then((attendanceTable) => {
                        resolve(attendanceTable);
                    })

            })
            .catch(error => reject(error))
    })
}

function getAttendanceJSON(html) {
    return new Promise((resolve, reject) => {
        data = {};
        attendanceSubjects = [];
        let $ = cheerio.load(html);
        rows = $("table").find("tr");
        rows.each((i, row) => {
            if (!(($(row).children("td:nth-child(3)").text().trim() == 'N/A') || ($(row).children("td:nth-child(1)").text().trim() == "") || ($(row).children("td:nth-child(1)").text().trim() == "Subject Code"))) {
                let attendance = {
                    //subjectCode: $(row).children("td:nth-child(1)").text().trim(),
                    s: $(row).children("td:nth-child(2)").text().trim(),//subjectName
                    p: $(row).children("td:nth-child(4)").text().trim(), //percentage
                    totalClass: Number($(row).children("td:nth-child(3)").text().trim().split('/')[1]),
                    totalPresent: Number($(row).children("td:nth-child(3)").text().trim().split('/')[0])
                }
                toAttend = Math.ceil(((attendance['totalClass'] * 0.75) - attendance['totalPresent']) / 0.25);
                if (toAttend > 0) {
                    if (toAttend > 1)
                        attendance['c'] = `Need to attend next ${toAttend} classes.`;//calculatedClass
                    else
                        attendance['c'] = "Need to attend the next class.";
                } else if (toAttend === 0) {
                    attendance['c'] = "Perfectly balanced, but you can't miss next class.";
                } else {
                    canMiss = Math.floor((attendance['totalPresent'] - 0.75 * attendance['totalClass']) / 0.75);
                    if (canMiss > 1)
                        attendance['c'] = `You can cut next ${canMiss} classes.`;
                    else
                        attendance['c'] = "You can cut the next class";
                }
                delete attendance['totalClass'];
                delete attendance['totalPresent'];
                delete attendance['subjectCode'];
                attendanceSubjects.push(attendance);
            }
            data['Summary'] = attendanceSubjects;
        })
        resolve(data);
    })
}

function getAttendance(username, password) {
    return new Promise((resolve, reject) => {
        getAttendanceHTML(username, password)
            .then((html) => { return getAttendanceJSON(html) })
            .then(attendanceJSON => { return attendanceJSON })
            .then((attendance) => {
                getStudentData(username, password)
                    .then((studentData) => {
                        attendance['Student'] = studentData['Student'];
                        attendance['Overall'] = studentData['Overall'];
                        resolve(attendance);
                    })
            })
            .catch(error => { reject(error) })
    })
}

function isValidLogin(username, password) {
    return new Promise((resolve, reject) => {
        getAuthorizationCookie(username, password)
            .then((cookie) => {
                fetch('https://sctce.etlab.in/user/todo', {
                    method: 'GET',
                    headers: {
                        Cookie: cookie, Host: 'sctce.etlab.in'
                    }
                })
                    .then((response) => { return response.text() })
                    .then((html) => {
                        let $ = cheerio.load(html);
                        title = $("title").text().trim();
                        if (title === "etlab | To Do")
                            resolve(true)
                        else
                            resolve(false)
                    })
            })
    })
}

function getStudentData(username, password) {
    return new Promise((resolve, reject) => {
        getAuthorizationCookie(username, password)
            .then(cookie => {
                //TODO: Fix Semester Value fetch
                year = username.substr(0,2);
                let sem_id = SEM_VALUE[year];
                let post_body = sem_id === '' ? '' : `semester=${sem_id}`;
                fetch('https://sctce.etlab.in/ktuacademics/student/viewattendancesubjectdutyleave/20',  
                {
                        method: 'POST',
                        headers: {
                            Cookie: cookie,
                            Host: 'sctce.etlab.in',
                            Origin: 'https://sctce.etlab.in',
                            Referer: 'https://sctce.etlab.in/ktuacademics/student/viewattendancesubject/20',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: post_body
                    },
                )
                    .then((response) => {
                        return response.text();
                    })
                    .then((html) => {
                        let $ = cheerio.load(html);
                        topicIndex = {};
                        $("table th").each((index, heading) => {
                            index = index + 1;
                            switch ($(heading).text().trim()) {
                                case ("Duty Leave"):
                                    topicIndex['Duty Leave Hours'] = index;
                                    break;
                                case ("Percentage"):
                                    topicIndex['Overall Attendance'] = index;
                                    break;
                                case ("Duty Leave Percentage"):
                                    topicIndex['Duty Leave Percentage'] = index;
                                    break;
                            }
                        })
                        let Overall = $(`table td:nth-child(${topicIndex['Overall Attendance']})`).text().trim()//overall percentage
                        /**for (const [key, value] of Object.entries
                            (topicIndex)) {
                            currentOverall = {}
                            currentOverall['key'] = key;
                            currentOverall['percentage'] = $(`table td:nth-child(${value})`).text().trim();
                            Overall.push(currentOverall);
                        }**/
                        Student = {}
                        Student['Name'] = $("table td:nth-child(3)").text().trim()
                        Student['Branch'] = $("table td:nth-child(1)").text().trim()
                        Student['RollNumber'] = $("table td:nth-child(2)").text().trim()
                        data = { Student: Student, Overall: Overall }
                        resolve(data);
                    })
            })
    })
}

function getDetailedMetadata(username, password) {
    return new Promise((resolve, reject) => {
        getAuthorizationCookie(username, password)
            .then((cookie) => {
                fetch('https://sctce.etlab.in/ktuacademics/student/attendance', {
                    method: 'POST',
                    headers: {
                        Cookie: cookie
                    }
                })
                    .then(response => { return response.text() })
                    .then(html => {
                        let $ = cheerio.load(html);
                        let semester = $("#semester").val();
                        let year = $('#year').val();
                        let months = new Array();
                        $("#month > option").each((i, e) => { months.push($(e).val()) });
                        let metadata = { Sem: semester, Year: year, Months: months };
                        resolve(metadata);
                    })
            })
    })
}

function getDetailedJSON(html, payload) {
    return new Promise((resolve, reject) => {
        let $ = cheerio.load(html);
        let result = [];
        let month = payload['month'];
        let year = payload['year'];
        $("#itsthetable tr").each((i, row) => {
            cells = $(row).children("td").length
            if (cells === 6) {
                day = $(row).children("th").html().split('<', 1)[0].trim()
                day = day.length === 1 ? '0' + day : day;
                date = day + '-' + month + '-' + year;
                periods = [];
                let isEmpty = true;
                let AbNumHrs = 0;
                let PrNumHrs = 0;
                $(row).children("td").each((i, period) => {
                    let currentDay = {}
                    if ($(period).text().trim() !== '') {
                        subjectName = $(period).html().split('<s', 1)[0].split('>', 2)[1].replace('&amp;', '&').trim()
                        if ($(period).hasClass("absent")) {
                            status = "A";
                            AbNumHrs++;
                        } else {
                            status = "P";
                            PrNumHrs++;
                        }
                        id = i + 1;
                        teacher = '';
                        isEmpty = false;
                    } else {
                        subjectName = '';
                        status = '-';
                        teacher = '';
                        id = i + 1;
                    }
                    currentDay['Subject'] = subjectName;
                    currentDay['ID'] = id;
                    currentDay['Status'] = status;
                    currentDay['Teacher'] = '';
                    periods.push(currentDay)
                })
                if (!isEmpty)
                    result.push({ 'Date': date, 'Periods': periods, 'AbNumHrs': AbNumHrs, 'PrNumHrs': PrNumHrs })
            }
        })
        resolve(result);
    })
}

function getCombinedAttendance(username, password, metadata) {
    let url = "https://sctce.etlab.in/ktuacademics/student/attendance";
    return new Promise((resolve, reject) => {
        let semester = metadata['Sem'];
        let year = metadata['Year'];
        let months = metadata['Months'];
        getAuthorizationCookie(username, password)
            .then(cookie => {
                let result = [];
                for (let i = 0; i < months.length; i++) {
                    let month = months[i];
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            Connection: 'keep-alive',
                            Host: 'sctce.etlab.in',
                            Origin: 'https://sctce.etlab.in',
                            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:72.0) Gecko/20100101 Firefox/72.0',
                            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'Content-Type': 'application/x-www-form-urlencoded',
                            Cookie: cookie,
                        },
                        body: `semester=${semester}&month=${month}&year=${year}`
                    })
                        .then((response) => {
                            return response.text();
                        })
                        .then(html => {
                            let payload = {};
                            payload['month'] = '0' + month;
                            payload['year'] = year;
                            payload['semester'] = semester;
                            getDetailedJSON(html, payload)
                                .then(detailedJSON => {
                                    result = result.concat(detailedJSON);
                                    return result;
                                })
                                .then(finalData => {
                                    if (i === months.length - 1) {
                                        resolve(finalData)
                                    }
                                })
                        })
                }
            })
    })
}


exports.isValidLogin = isValidLogin;
exports.getAttendance = getAttendance;