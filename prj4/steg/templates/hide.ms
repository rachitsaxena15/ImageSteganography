<!DOCTYPE html>
<html>
  <head>
    <title>Image Hide - CS580W</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body bgcolor = "ghostwhite">
  {{}}
    <div>
    {{^msg}}
    {{^location}}
      <h3><font color = "B77612" face = "arial">List of available images: </font></h3>
    {{/location}}
    {{/msg}}
    {{#location}}
      <h3><font color = "B77612" face = "arial">Hide Success! New Image created as <i><u>{{img}}.png</u></i> under group <i>steg</i>. 
      Access your message <a href = "{{location}}">here.</a></font></h3>
    {{/location}}
      <p class="error"><h3><font color = "#ec1200" face = "arial">{{msg}}</font></h3></p>
    </div>
    <form action = "/hide.html" enctype="multipart/form-data" method = "POST">
    <div class = "parentImgDiv">
      {{#images}}
        <div class = "imgDiv">
          <a href="{{imageUrl}}/images/inputs/{{value}}.png"><img class="container img" src="{{imageUrl}}/images/inputs/{{value}}.png"/></a><br>
          <p class = "pCenter"><em>{{value}}.png</em><br>
           <input type = "radio" name = "imgSelect", margin-left: 60px; value = {{value}} {{#selected}}checked{{/selected}}>
        </div>
      {{/images}}
   
      {{#showForm}} 
      </div>
      <div class = "inputDiv">
        <font color = "B77612" face = "arial"><b>Upload your message</b></font>
          <input type = "radio" name = "msgSelect" value = "upload"{{#file}}checked {{/file}}>
             <input type = "file" name = "filemsg">
        
        <p><font color = "B77612" face = "arial"><b>OR</b></font></p>
        
        <font color = "B77612" face = "arial"><b>Type your message</b></font>
          <input type = "radio" name = "msgSelect" value = "text" {{#text}} checked {{/text}}>
            <input type = "text" name = "textmsg" {{#usrmsg}} value = "{{usrmsg}}" {{/usrmsg}}>
      <p class = "pCenter "><input type="submit" value="Hide Message" class = "submit"></p>
      </div>
    </form>
    <p>Please select an image to continue</p>
    <ul><li><em> Note: To view full size, click on the image</em></li></ul>
    {{/showForm}}
    <hr>
    {{>footer}}
  </body>
</html>
