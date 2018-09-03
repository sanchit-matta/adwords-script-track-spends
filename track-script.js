/**
*
* Hourly Email Updates
*
* This script can be configured to email you every hour with totals for selected performance metrics (like cost)
* for your account for the day so far.
*
* You can also setBudget for a campaign based on conditions which u require
*
* This script also generates alerts on your email in case the cost/conv is very high(can be configured)
*
* Doesn't Support Universal App Campaign,Video Campaign,Shopping Campaign for budget updation as there is
* no support from Google for AdWordsApp Api for these type of campaigns, but Report Apis are supported
*
*
* Version: 1.1
* Google AdWords Script maintained by heliumapps
*
**/


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//Options

var campaignNameDoesNotContain = [];
// Use this if you want to exclude some campaigns.
// For example ["Display"] would ignore any campaigns with 'Display' in the name,
// while ["Display","Shopping"] would ignore any campaigns with 'Display' or
// 'Shopping' in the name.
// Leave as [] to not exclude any campaigns.

var campaignNameContains = ["abc", "def"];
// Use this if you only want to look at some campaigns.
// For example ["Brand"] would only look at campaigns with 'Brand' in the name,
// while ["Brand","Generic"] would only look at campaigns with 'Brand' or 'Generic'
// in the name.
// Leave as [] to include all campaigns.

var email = ["abc@example.com"];
// The email address you want the hourly update to be sent to.
// If you'd like to send to multiple addresses then have them separated by commas,
// for example ["aa@example.com", "bb@example.com"]

var metricsToReport = ["Amount", "CostPerConversion", "Cost", "Impressions", "Clicks", "AverageCpc"];
// Allowed fields: ["Amount", "CostPerConversion", "AverageCpc", "Conversions", "Impressions", "Clicks", "Cost", "AverageCpm", "Ctr"]

var currencySymbol = "Rs";
// Used for formatting in the email.

var thousandsSeparator = ",";
// Numbers will be formatted with this as the thousands separator.
// eg If this is ",", 1000 will appear in the email as 1,000
// If this is ".", 1000 will appear in the email as 1.000
// If this is "" 1000 will appear as 1000.

var decimalMark = ".";
// Numbers will be formatted with this as the decimal mark
// eg if this is ".", one and a half will appear in the email as 1.5
// and if this is "," it will be 1,5

var mail_budget_changed = false;  // flag for if budget was updated
var mail_cost_per_conversion_high = -1;  // flag for campaign whose cost per conversion is high


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
// Functions

function main() {
  // Get the campaign IDs (based on campaignNameDoesNotContain and campaignNameContains)
  var campaignIds = getCampaignIds();

  var localDate = Utilities.formatDate(new Date(), AdWordsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
  var localTime = Utilities.formatDate(new Date(), AdWordsApp.currentAccount().getTimeZone(), "HH:mm");
  Logger.log("Date: " + localDate);
  Logger.log("Time: " + localTime);

  // Check the given metrics, and make sure they are trimmed and correctly capitalised
  var allowedFields = ["Amount", "CostPerConversion", "AverageCpc", "Conversions", "Impressions", "Clicks", "Cost", "AverageCpm", "Ctr"];
  var metrics = checkFieldNames(allowedFields, metricsToReport);

  // Get the total metrics for today
  var totals = getMetrics("TODAY", campaignIds, metrics)

  setBudgetForSingleCampaign(totals,0);

  sendMailer(totals,campaignIds,metrics,localDate,localTime);
}



function setBudgetForSingleCampaign(campaign_attributes, index_of_campaign) {

	var campaignIterator = AdWordsApp.campaigns()
      .withCondition("Name CONTAINS_IGNORE_CASE 'INSERT CAMPAIGN NAME HERE'")
  Logger.log( campaignIterator.totalNumEntities());  /// Returns 0 doe Universal App Campaign i.e no support

  if (campaignIterator.hasNext()) {
    var campaign = campaignIterator.next();
    Logger.log(campaign_attributes[index_of_campaign]["Amount"]-campaign_attributes[index_of_campaign]["Cost"]);

    //If the difference between budget and cost is less than 400, update the budget = budget+400
    if(campaign_attributes[index_of_campaign]["Amount"] - campaign_attributes[index_of_campaign]["Cost"] < 400){
      	mail_budget_changed = true;
    	campaign.getBudget().setAmount(campaign.getBudget().getAmount()+400);
    }
    Logger.log('Campaign with name = ' + campaign.getName() +
        ' has budget = ' + campaign.getBudget().getAmount());
  }
}


function sendMailer(totals,campaignIds,metrics,localDate,localTime){

  	// Assemble the email subject
  var subject = AdWordsApp.currentAccount().getName() + " Hourly Email";
  var message="";

  for(var i=0; i<campaignNameContains.length; i++){
    if(totals[i]["CostPerConversion"]>7) {    // You can change the benchmark CostPerConversion rate here
        mail_cost_per_conversion_high = i;
      }
  }

	//Assemble the email message
    for(var i=0; i<campaignNameContains.length; i++){
      	Logger.log("\n");
      	Logger.log(campaignNameContains[i] + ":");
  		message += "\nMetrics for Campaign = " + campaignNameContains[i] +" "+ localDate + " at " + localTime + "\n";

  		for (var j=0; j<metrics.length; j++) {
    		var isCurrency = (metrics[j] == "Cost" || metrics[j] == "ConversionValue" || metrics[j]=="CostPerConversion" || metrics[j]=="Amount");
    		message += metrics[j] + " = " + formatNumber(totals[i][metrics[j]], isCurrency) + "\n";
    		Logger.log(metrics[j] + " = " + totals[i][metrics[j]]);
  		}
    }

    if(mail_cost_per_conversion_high != -1) {
      message += "\nCost per conversion is high(>7) for " + campaignNameContains[mail_cost_per_conversion_high]+ " campaign. \n";
    }

    If(mail_budget_changed == true) {
      message += "\n Budget was updated. \n"
    }

  // Send the email
  MailApp.sendEmail(email.join(','), subject, message);
  Logger.log("Message to " + email.join(',') + " sent.");
}

// Get the IDs of campaigns which match the given options
function getCampaignIds() {
  var whereStatement = "WHERE CampaignStatus IN ['ENABLED','PAUSED','REMOVED'] ";
  var whereStatementsArray = [];
  var campaignIds = [];

  for (var i=0; i<campaignNameDoesNotContain.length; i++) {
    whereStatement += "AND CampaignName DOES_NOT_CONTAIN_IGNORE_CASE '" + campaignNameDoesNotContain[i].replace(/"/g,'\\\"') + "' ";
  }

  if (campaignNameContains.length == 0) {
    whereStatementsArray = [whereStatement];
  } else {
    for (var i=0; i<campaignNameContains.length; i++) {
      whereStatementsArray.push(whereStatement + 'AND CampaignName CONTAINS_IGNORE_CASE "' + campaignNameContains[i].replace(/"/g,'\\\"') + '" ');
    }
  }

  for (var i=0; i<whereStatementsArray.length; i++) {
    var adTextReport = AdWordsApp.report(
      "SELECT CampaignId " +
      "FROM   CAMPAIGN_PERFORMANCE_REPORT " +
      whereStatementsArray[i] +
      "DURING TODAY");

    var rows = adTextReport.rows();
    while (rows.hasNext()) {
      var row = rows.next();
      campaignIds.push(row['CampaignId']);
    }
  }

  if (campaignIds.length == 0) {
    throw("No campaigns found with the given settings.");
  }

  Logger.log(campaignIds.length + " campaigns found");
  return campaignIds;
}


// Verify that all field names are valid, and return a list of them with the
// correct capitalisation
function checkFieldNames(allowedFields, givenFields) {
  var allowedFieldsLowerCase = allowedFields.map(function (str){return str.toLowerCase()});
  var wantedFields = [];
  var unrecognisedFields = [];
  for (var i=0; i<givenFields.length; i++) {
    var fieldIndex = allowedFieldsLowerCase.indexOf(givenFields[i].toLowerCase().replace(" ","").trim());
    if(fieldIndex === -1){
      unrecognisedFields.push(givenFields[i]);
    } else {
      wantedFields.push(allowedFields[fieldIndex]);
    }
  }

  if (unrecognisedFields.length > 0) {
    throw unrecognisedFields.length + " field(s) not recognised: '" + unrecognisedFields.join("', '") +
      "'. Please choose from '" + allowedFields.join("', '") + "'.";
  }

  return wantedFields;

}


// Formats a number with the specified thousand separator and decimal mark
// Adds the currency symbol and two decimal places if isCurrency is true
function formatNumber(number, isCurrency) {
  if (isCurrency) {
    var formattedNumber = number.toFixed(2);
    formattedNumber = formattedNumber.substr(0,formattedNumber.length-3);
    formattedNumber = formattedNumber.split('').reverse().join('').replace(/(...)/g,"$1 ").trim().split('').reverse().join('').replace(/ /g,thousandsSeparator);
    formattedNumber = currencySymbol + " " + formattedNumber + decimalMark + number.toFixed(2).substr(-2);
  } else {
    var formattedNumber = number.toFixed(0).split('').reverse().join('').replace(/(...)/g,"$1 ").trim().split('').reverse().join('').replace(/ /g,thousandsSeparator);
  }
  return formattedNumber;
}


// Get totals for the listed metrics in the given campaigns in the given date range
function getMetrics(dateRange, campaignIds, metrics) {
  // Initialise the object that will store the metrics' data
  var totals = [[]];
  for(var i=0; i<campaignIds.length; i++){
    totals.push([0]);
  	for (var j=0; j<metrics.length; j++) {
    	totals[i][metrics[j]] = 0;
  	}

  	var report = AdWordsApp.report(
    	'SELECT Amount, ' + metrics.join(', ') + " " +
    	'FROM   CAMPAIGN_PERFORMANCE_REPORT ' +
      	'WHERE  CampaignId = "' + campaignIds[i] + '" DURING ' + dateRange);

  	var rows = report.rows();
  	while (rows.hasNext()) {
    	var row = rows.next();
    	for (var j=0; j<metrics.length; j++) {
      		totals[i][metrics[j]] = parseFloat(row[metrics[j]].replace(/,/g, ""));
    	}
  	}
  }

  return totals;
}
