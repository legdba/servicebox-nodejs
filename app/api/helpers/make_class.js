// makeClass - By John Resig (MIT Licensed)
exports.makeClass = function(){
  return function(args){
    if ( this instanceof arguments.callee ) {
      if ( typeof this.init == "function" )
        this.constructor.apply( this, args.callee ? args : arguments );
    } else
      return new arguments.callee( arguments );
  };
}
