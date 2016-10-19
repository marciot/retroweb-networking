var failed = 0;
var passed = 0;

function assertEquals(lhs,rhs) {
	var lhs_eval = eval(lhs);
	var rhs_eval = eval(rhs);
	
	if(lhs_eval.constructor === Array) {
		lhs_eval = lhs_eval.toString();
	}
	
	if(rhs_eval.constructor === Array) {
		rhs_eval = rhs_eval.toString();
	}

	if(lhs_eval !== rhs_eval) {
		var msg = "<P>FAILED: assertEquals: " + lhs + " is " + lhs_eval + " expected " + rhs_eval + "</P>";
		document.write(msg);
		console.log(msg);
		console.trace();
		failed++;
	} else {
		//document.write("<P>PASSED: assertEquals: " + lhs + " is " + lhs_eval + " which matches " + rhs_eval + "</P>");
		passed++;
	}
}

function assertNotEquals(lhs,rhs) {
	var lhs_eval = eval(lhs);
	var rhs_eval = eval(rhs);
	
	if(lhs_eval.constructor === Array) {
		lhs_eval = lhs_eval.toString();
	}
	
	if(rhs_eval.constructor === Array) {
		rhs_eval = lhs_eval.toString();
	}

	if(lhs_eval ===  rhs_eval) {
		document.write("<P>FAILED: assertEquals: " + lhs + " is " + lhs_eval + " expected " + rhs_eval + "</P>");
		failed++;
	} else {
		//document.write("<P>PASSED: assertEquals: " + lhs + " is " + rhs_eval + "</P>");
		passed++;
	}
}

function summarize() {
	if(failed) {
			document.write("<P>TESTS FAILED!</P>");
	} else {
		document.write("<P>" + passed + " TESTS PASSED!</P>");
	}
}