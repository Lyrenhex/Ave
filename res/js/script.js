function zoom(id){
    var element = document.getElementById(id);
    if(element.classList.contains("zoom")){
        element.classList.remove("zoom");
    }else{
        element.classList.add("zoom");
    }
}
