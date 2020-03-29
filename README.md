# RefJS

> ***This project has been deprecated and is no longer being maintained.***

A JavaScript library that contains many useful functions (including AJAX) to make scripting easier. It has C# style naming and was designed to work hand in hand with ASP .NET MVC/Core. <br />

**RefJS** was built on the idea of "YOU MIGHT NOT NEED JQUERY" (http://youmightnotneedjquery.com/). jQuery was pretty much a necessity at one point due to browser compatibility issues, however, we’ve come a long way since then. With the evolution of native JS, ECMAScript, and modern browsers, jQuery might no longer be needed. <br />

What's wrong with jQuery? Nothing really, if it makes your development faster and easier, go ahead and use it. However, I personally did not like the performance and the overhead of it, especially when websites were ran on mobile devices.  I preferred my websites to run/execute as fast as possible on mobile devices, therefore, opted in for native JS solution instead. <br />

In doing so, I’ve created RefJS.  It’s basically a JavaScript library that contains many functions to make the transition from jQuery to native JS easier. <br />

<a href="https://htmlpreview.github.io/?https://github.com/RefX64/RefJS/blob/master/docs/rj.html" target="_blank">Read the full documentation</a>

### Take a look at some examples below:

```javascript
// First initialize the class for use.
const rj = new RefJS();

rj.find("#id").value = "NewValue"; // .class, tag, complex selector

rj.AsyncGet('url', { id: 5 }).then(function (result) {
   app.displayResult(result); 
}).finally(app.hideLoadingDiv);

rj.AsyncLoad('#toLoadDiv' 'url', { id: 5 }).then(function () {
    app.doStuff();
}).catch(function(error) {
    app.logError(error);
}).finally(function() {
    app.hideLoadingDiv();
});

if (rj.ValidateForm('formToValidateId'))
{
    rj.AsyncSubmitForm('formToValidateId').then(...);
}

rj.StringFormat("Car: {0}, Make: {1}", "Nissan", "Sentra"); // "Car: Nissan, Make: Sentra"

rj.UrlAction("Index", "Home", { id: 5}) // Url -> "/Home/Index/5"

rj.PopulateSelectList("#listToPopulate", result, true); // Populate a select list item with results. 
```