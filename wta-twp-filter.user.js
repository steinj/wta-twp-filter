/*
 * Copyright 2015 Joshua Stein.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ==UserScript==
// @name        wta-twp-filter
// @namespace   https://github.com/steinj/wta-twp-filter
// @include     https://vols.wta.org/web/web.pl?*
// @require     http://code.jquery.com/jquery-2.1.4.min.js
// @version     1
// @grant       none
// ==/UserScript==

String.prototype.splice = function( idx, rem, s ) {
    return (this.slice(0,idx) + s + this.slice(idx + Math.abs(rem)));
};

/**
 * Determines if a row/value/obj is a header element.
 *
 * @param idx numerical index of the element
 * @param value a value that may be used in the decision
 * @param obj the object that is being analyzed
 * @return true if a header element, false otherwise
 */
function isHeader(idx, value, obj) {
  if (idx < 1) {
    return true;
  }
  return false;
}

/*
 * Make a list of the header elements, these will define css classes
 */
var headerList = [];
$("th").each(function() {
  var txt = this.children[0].innerHTML;
  headerList.push(txt.replace(" ", "-"));
});

/*
 * Give each "td" entry a class corresponding to the header in the same column
 */
$("tr").each(function(row, rValue) {
  if (!isHeader(row, rValue, this)) {
    $(this).children("td").each(function(col, cValue) {
      $(cValue).addClass(headerList[col]);
    })
  }
})

/**
 * Returns the list of possible options, including the "any" option
 *
 * <p>Options are determined by possible values present and is therefore dynamic.
 *
 * @param clazz the header class whose possible values are to be looked up
 * @param extractor a function that, given a node, returns the text used as an option
 * @return list of strings in which each string is a possible filter option
 */
function getOptions(clazz, extractor) {
  options = ['any'];
  $("." + clazz).each(function() {
    var txt = extractor(listLeaf($(this))).toLowerCase();
    if (options.indexOf(txt) === -1) {
      options.push(txt);
    }
  });
  return options; 
}

/**
 * Returns the last DOM element in a nested list of DOM elements
 *
 * <p>This assumes that there is only a single child element
 *
 * @param node the current node in the list being traversed
 * @return the last DOM element, i.e. a DOM element with no children
 */
function listLeaf(node) {
    if ($(node).children().size() == 0) {
      return node;
    }
    return listLeaf($(node).children()[0]);
}

/**
 * (Un)hide table row
 *
 * @param node the row to (un)hide
 * @param attr the attribute that the filter is acting on
 * @param val the value that the comparison filter acted on
 * @param isMatch true if the value should be displayed given the attr and value, false otherwise
 */
function updateHiding(node, attr, val, isMatch) {
  var filterAttrName = "filter-cnt";
  var overall = node.attr(filterAttrName) == null ? 0 : node.attr(filterAttrName);
  var curr = node.attr(attr) == null ? 0 : node.attr(attr);
  if (curr == 0 && !isMatch) {
    curr++;
    overall++;
  } else if (isMatch && curr == 1) {
    curr--;
    overall--;
  }
  node.attr(attr, curr);
  
  node.attr(filterAttrName, overall);
  if (overall > 0) {
    node.css("display", "none");
  } else {
    node.css("display", "table-row");
  }
}

/**
 * Add option to a select DOM.
 * The option is simple with HTML = value = optValue
 *
 * @param select the select object
 * @param optValue the string value of the option
 */
function addSimpleOption(select, optValue) {
  option = document.createElement('option');
  option.value = optValue;
  option.innerHTML = optValue;
  select.appendChild(option);
}

/*
 * Create the filters for each header
 */
$("th").each(function(idx) {
  var extractor = null;
  switch(idx) {
    case 0: // Click-to
      /*
       * Reduce options to ['any', 'open', 'full', 'waitlist']
       */
      extractor = function(v) {
        var txt = v.innerHTML;        
        if (txt.indexOf("Join") > -1) {
          return "open";
        } else if (txt.indexOf("wta.org") > -1) {
          txt = $(v).parent().text();
          if (txt.indexOf("Waitlist") > -1) {
            return txt.substr(txt.indexOf("Waitlist"), "Waitlist".length);
          }
        }
        return txt;
      }
    case 1: // Dates
      if (extractor == null) {
        /*
         * Reduce options to ['any', 'weekday', 'weekend']
         */
        extractor = function(v) {
          var txt = $(v).parent().text();

          var offset = 0;
          var idxDay1 = 0;
          var idxDay2 = 0;
          if (txt.indexOf("-") > -1) {
            offset += 4;
            idxDay2 = 1;
          }
          txt = txt.splice(3 + offset, 0, "-").toLowerCase();
          var lst = txt.split("-");

          var days = [];
          days.push(lst[idxDay1]);
          days.push(lst[idxDay2]);

          if (days[0] === "sat" || days[0] === "sun" ||
              days[1] === "sat" || days[1] === "sun") {
            return "weekend";
          } else {
            return "weekday";
          }
        }
      }  
    case 4: // Free-pass
      if (extractor == null) {
        /*
         * Reduce options to ['any', 'yes', 'no']
         */
        extractor = function(v) { return v.innerHTML; }
      }

      // Create the selector & options
      var select = document.createElement('select');
      var options = getOptions(headerList[idx], extractor);
      for (var i = 0; i < options.length; i++) {
        addSimpleOption(select, options[i]);
      }

      // Create the filter
      $(select).change(function() {
        var opt = $(this).find("option:selected").val().toLowerCase();

        $("." + headerList[idx]).each(function() {
          var val = extractor(listLeaf($(this))).toLowerCase();
          updateHiding($(this).parent(), headerList[idx], val, val === opt || opt === "any"); 
        });
      });
      
      // Add the filter
      $(this).append(select);
      break;
      
    default: // Do nothing
  }
});
