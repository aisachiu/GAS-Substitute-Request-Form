//GLOBALS

var mySSId = '15c1cNAuw10h2svkSKIqbjriqLyd0RvJ4ifUEZXzFltA/';
var userSheetName = 'Members';
var challengeSheetName = 'Challenges';
var appTitle = 'Print Substitute Schedule';
var entityTitle = 'class'; // used in titles throughout app

// When form submitted, cycle through all form entries. Any without Doc IDs, create the Doc and send it to the requester
function updateAllOnFormSubmit() { 
  var mySs = SpreadsheetApp.getActiveSpreadsheet();
  
  //Read form entries
  var formSheet = mySs.getSheetByName('Form Requests');
  var myData = formSheet.getDataRange().getValues();
  
  //Get Column numbers
  var docIDCol = myData[0].indexOf('DocID'); //ID is placed in this column if the Doc has been created.
  var teacherCol = myData[0].indexOf('Teacher');	
  var dateAbsCol = myData[0].indexOf('Date');  //Find the column holding eventID
  var usernameCol = myData[0].indexOf('Email Address');
  var dayCol = myData[0].indexOf('DAY');
  
  Logger.log('doc: %s teach %s date %s user %s', docIDCol, teacherCol, dateAbsCol, usernameCol);
  
  //Cycle through all form entries. If there is no Doc ID, create the doc and send to requester
  for (var i=1; i < myData.length; i++) {
    if(myData[i][docIDCol] === "") {
      formSheet.getRange(i+1, docIDCol+1).setValue('-1');
      Logger.log([myData[i][teacherCol], myData[i][dayCol], myData[i][usernameCol], mySs]);
      
      var myGDocId = createGDoc(myData[i][teacherCol],  myData[i][dateAbsCol], myData[i][dayCol], myData[i][usernameCol], mySs);
      formSheet.getRange(i+1, docIDCol+1).setValue(myGDocId);
      //Email link to requester
      var bodyText = 'You requested a substitute teacher schedule for ' +myData[i][teacherCol] + ' on ' + myData[i][dateAbsCol] +'. Here it is: https://docs.google.com/document/d/' + myGDocId;
      MailApp.sendEmail(myData[i][usernameCol], 'Substitute Teacher Schedule Request - ' + myData[i][teacherCol] + ' on ' + myData[i][dateAbsCol], bodyText);
      
    }
  }
}

// Creates a Google Doc with all the sub schedule 
function createGDoc (teacherID, dateAbs, dayID, requester, mySs) {
  var newDoc = DocumentApp.create('Substitute Timetable for ' + teacherID + ' - ' + dateAbs).addEditor(requester);
  var headText = [["Teacher:" + teacherID, 'Date: ' + dateFormater(dateAbs), dayID, 'Substitute:','']];
  
  var lineCount =0; //Used to check for need for page breaks
  var lineBreakAt = 20; //specifies how many lines before linebreak is needed.
  
  var Tstyle = {}; //Style for student register table
  Tstyle[DocumentApp.Attribute.FONT_SIZE] = 9;
  Tstyle[DocumentApp.Attribute.PADDING_TOP] = 0;
  Tstyle[DocumentApp.Attribute.PADDING_BOTTOM] = 0;
  Tstyle[DocumentApp.Attribute.PADDING_LEFT] = 0;
  Tstyle[DocumentApp.Attribute.PADDING_RIGHT] = 0;
  
  var Hstyle = {}; //Style for header table
  Hstyle[DocumentApp.Attribute.FONT_SIZE] = 10;
  Hstyle[DocumentApp.Attribute.PADDING_TOP] = 0;
  Hstyle[DocumentApp.Attribute.PADDING_BOTTOM] = 0;
  Hstyle[DocumentApp.Attribute.PADDING_LEFT] = 0;
  Hstyle[DocumentApp.Attribute.PADDING_RIGHT] = 0;
  Hstyle[DocumentApp.Attribute.BORDER_WIDTH] = 0;  
  
  var docID = newDoc.getId();
  var body = newDoc.getBody()
                   .setMarginTop(25)
                   .setMarginLeft(20)
                   .setMarginRight(20)
                   .setMarginBottom(20);
  
  // Create Doc header / Title
  newDoc.addHeader().appendTable(headText)
      .setAttributes(Hstyle)
      .setColumnWidth(0, 220)
      .setColumnWidth(1, 100)
      .setColumnWidth(2,48);
      
  body.appendParagraph('Substitution Schedule').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  lineCount +=2; 
  //Read timetable
  var tt = mySs.getSheetByName('TimetableHS').getDataRange().getValues();
  var dayCol = tt[0].indexOf(dayID);

  //Read Student Data
  var ss = mySs.getSheetByName('HS List').getDataRange().getValues();
  
  //Read teacher courses
  var myCourses = ArrayLib.filterByText(mySs.getSheetByName('TeacherCourses').getDataRange().getValues(),0,teacherID); //Get teacher's courses
  var periodStartCol = 17
  Logger.log('----------------- PERIOD------');
  //Cycle through timetable
  for (var s=1; s < tt.length; s++){
    var thisPeriod = tt[s][dayCol];
    var thisCourse = ArrayLib.filterByValue(myCourses,4,thisPeriod); //Get the course for the period

    
    Logger.log('psrseInt: %s, thisCourse: ',thisPeriod, thisCourse);
    var hPara = body.appendParagraph(tt[s][2] + ' - ' + tt[s][3] +': ')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    lineCount++;
                    
    if  (thisCourse.length > 0){ //teacher's course found in this period
      var mySubjectCode = thisCourse[0][1];
      for ( var c=1; c < thisCourse.length; c++) mySubjectCode += '/'+ thisCourse[c][1];
      
      hPara.appendText(mySubjectCode + ' (' + thisCourse[0][6] + ') in ROOM ' + thisCourse[0][5]);
          
      if (thisPeriod >= 0 && thisPeriod < 8){ // It's a HS course on the schedule
        var thisSs = ArrayLib.sort(ArrayLib.filterByText(ss, periodStartCol + thisPeriod, teacherID+","),2,true); //Get students in this course
        
        Logger.log("Students: %s", thisSs);
        
        if (thisSs.length > 0){
          

          //var ssTable = [["Student","","Student","","Student",""]];
          var ssTable = [];
          var maxRows = Math.ceil(thisSs.length / 3);
          for (var row=0; row < maxRows; row++){
            lineCount++;
            var thisColtxt = ['','','','','',''];
            if (row < thisSs.length) thisColtxt[0] = thisSs[row][3] + ' ' + thisSs[row][2] + ' (' + thisSs[row][0] + ')';
            if (row+maxRows < thisSs.length) thisColtxt[2] = thisSs[row+maxRows][3] + ' ' + thisSs[row+maxRows][2] + ' (' + thisSs[row+maxRows][0] + ')'; 
            if (row+(maxRows*2) < thisSs.length) thisColtxt[4] = thisSs[row+(maxRows*2)][3] + ' ' + thisSs[row+(maxRows*2)][2] + ' (' + thisSs[row+(maxRows*2)][0] + ')';
            ssTable.push(thisColtxt);
          }
        
        if (lineCount > 20) { //check to see if page break is needed
          body.insertPageBreak(body.getChildIndex(hPara));
          lineCount = 0;
        }
        var cWidth = 160;
        var dWidth = 15;
        var sTable = body.appendTable(ssTable).setAttributes(Tstyle);
        sTable.setColumnWidth(0, cWidth)
              .setColumnWidth(2, cWidth)
              .setColumnWidth(4, cWidth)
              .setColumnWidth(1, dWidth)
              .setColumnWidth(3, dWidth)
              .setColumnWidth(5, dWidth);
        body.appendParagraph('Notes: \n \n');
        
        
        } //if thisSs.length
      }
     }
  }
  
  
  
  newDoc.saveAndClose();
  DriveApp.getFileById(docID).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  return docID;

}




function insert(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}




/* 
* doGet - called when web URL accessed
*/
function doGet() {

// Check Permissions here if you wish to check user permissions

// Load index.html
  var myDoc = 'index'; 
  return HtmlService.createTemplateFromFile(myDoc).evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function loadGInfo() {

  var thisUser = Session.getActiveUser().getEmail();
  
  //CHECK AND LOG USER ACCESS
  
  var mySs = SpreadsheetApp.openById(mySSId);
  var memberData = mySs.getSheetByName(userSheetName).getActiveRange().getValues();
  
  var foundUser = ArrayLib.filterByValue(memberData, 0, thisUser);
  
  if(foundUser.length <=0){ //add user 
    Logger.log('no user');
  }else{
    Logger.log('found user');
    //Log time
  }
  
  //GET LIST OF CHALLENGES AND RETURN
  
  var challengeData = mySs.getSheetByName(challengeSheetName).getDataRange().getValues();
  
  Logger.log(challengeData);
  
  return [challengeData,"User"];

}


/* include - allows html content to be included */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}


function testGetCalDay(){
  var dateAbs = new Date("2016-01-11");
    var dateAbs2 = new Date("2016-01-13");
  var mySs = SpreadsheetApp.getActiveSpreadsheet();
  var hsTimetable = mySs.getSheetByName('TimetableHS').getDataRange().getValues();
  var refCal = CalendarApp.getCalendarById(hsTimetable[0][0]);
  var foundEvents = refCal.getEvents(dateAbs, dateAbs2);
  
  Logger.log(foundEvents);
}


function dateFormater(myDate){
var monthNames = [
  "Jan", "Feb", "Mar",
  "Apr", "May", "Jun", "Jul",
  "Aug", "Sep", "Oct",
  "Nov", "Dec"
];

var day = myDate.getDate();
var monthIndex = myDate.getMonth();
var year = myDate.getFullYear();

// console.log(day, monthNames[monthIndex], year);
return (day + ' ' + monthNames[monthIndex] + ' ' + year);
}


function testPageMargins(){
var myDoc = DocumentApp.openById('1tIgQj0du5P8g4z6uAZYDV1cbjxi2rrRdJYZXoOyIevM')
var myB = myDoc.getBody();
var a = 20;
myB.setMarginLeft(a).setMarginRight(a).setMarginTop(30).setMarginBottom(a);
myDoc.saveAndClose();
}