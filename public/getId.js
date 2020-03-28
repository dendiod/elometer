var id;
let user = JSON.stringify({message: 'send me id'});			
 let request = new XMLHttpRequest();
  request.open("POST", "/id", true);   
  request.onerror = function () {
	alert("Connection with server failed");
	return;
  };
  request.setRequestHeader("Content-Type", "application/json");
  request.addEventListener("load", function () {
      let receivedUser = JSON.parse(request.response);
	 id = receivedUser.id;				 
  });
  request.send(user);
