var coo_mflops = -1, csr_mflops = -1, dia_mflops = -1, ell_mflops = -1, diaII_mflops = -1, ellII_mflops = -1;
var coo_sum=-1, csr_sum=-1, dia_sum=-1, ell_sum=-1, diaII_sum = -1, ellII_sum = -1;
var coo_sd=-1, csr_sd=-1, dia_sd=-1, ell_sd=-1, diaII_sd = -1, ellII_sd = -1;
var coo_flops = [], csr_flops = [], dia_flops = [], ell_flops = [], diaII_flops = [], ellII_flops = [];
var variance;

function coo_test(A_coo, x_view, y_view, workers, gs)
{
  return new Promise(function(resolve){
  console.log("COO");
  console.log(inner_max);
  if(typeof A_coo === "undefined"){
    console.log("matrix is undefined");
    return resolve(-1);
  }
  if(typeof x_view === "undefined"){
    console.log("vector x is undefined");
    return resolve(-1);
  }
  if(typeof y_view === "undefined"){
    console.log("vector y is undefined");
    return resolve(-1);
  }
  var nnz_per_worker = Math.floor(anz/num_workers);
  var rem = anz - nnz_per_worker * num_workers;
  var t1, t2, tt = 0.0;
  var t = 0;
  function runCOO(){
    console.log("unvectorized COO");
    pending_workers = num_workers;
    clear_y(y_view);
    clear_w_y(A_coo);
    t1 = Date.now();
    for(var i = 0; i < num_workers; i++){
      if(i == num_workers - 1)
        workers.worker[i].postMessage(["coo", i, i * nnz_per_worker, (i+1) * nnz_per_worker + rem, A_coo.row_index, A_coo.col_index, A_coo.val_index, x_view.x_index, A_coo.w_y_view[i].y_index, inner_max]);
      else
        workers.worker[i].postMessage(["coo", i, i * nnz_per_worker, (i+1) * nnz_per_worker, A_coo.row_index, A_coo.col_index, A_coo.val_index, x_view.x_index, A_coo.w_y_view[i].y_index, inner_max]);
      workers.worker[i].onmessage = storeCOO;
    }
  }
  function runCOO_gs(){
    console.log("gather/scatter vectorized COO");
    pending_workers = num_workers;
    clear_y(y_view);
    clear_w_y(A_coo);
    t1 = Date.now();
    for(var i = 0; i < num_workers; i++){
      if(i == num_workers - 1)
        workers.worker[i].postMessage(["coo_gs", i, i * nnz_per_worker, (i+1) * nnz_per_worker + rem, A_coo.row_index, A_coo.col_index, A_coo.val_index, x_view.x_index, A_coo.w_y_view[i].y_index, inner_max]);
      else
        workers.worker[i].postMessage(["coo_gs", i, i * nnz_per_worker, (i+1) * nnz_per_worker, A_coo.row_index, A_coo.col_index, A_coo.val_index, x_view.x_index, A_coo.w_y_view[i].y_index, inner_max]);
      workers.worker[i].onmessage = storeCOO;
    }
  }

  function storeCOO(event){
    pending_workers -= 1;
    if(pending_workers <= 0){
      for(var i = 0; i < num_workers; i++)
        sparse_instance.exports.sum(y_view.y_index, A_coo.w_y_view[i].y_index, N);
      t2 = Date.now();
      //console.log(1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000));
      if(t >= 10){
        coo_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
        tt += t2 - t1;
      }
      t++;
      if(t < (outer_max + 10)){
	if(gs == 0)
          runCOO();
	else if(gs == 1)
          runCOO_gs();
      }
      else{
        tt = tt/1000;
        coo_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
        variance = 0;
        for(var i = 0; i < outer_max; i++)
          variance += (coo_mflops - coo_flops[i]) * (coo_mflops - coo_flops[i]);
        variance /= outer_max;
        coo_sd = Math.sqrt(variance);
        coo_sum = fletcher_sum_y(y_view);
        pretty_print_y(y_view);
        pretty_print_COO(A_coo);
        pretty_print_x(x_view);
        console.log('coo sum is ', coo_sum);
        console.log('coo mflops is ', coo_mflops);
        console.log("Returned to main thread");
        return resolve(0);
      }
    }
  }
  if(gs == 0)
    runCOO();
  else if(gs == 1)
    runCOO_gs();
  });
}

function static_nnz_csr_test(A_csr, x_view, y_view, workers, gs)
{
  return new Promise(function(resolve){
    console.log("CSR");
    if(typeof A_csr === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    console.log(calculate_csr_locality_index(A_csr));

    var t1, t2, tt = 0.0;
    var t = 0;
    var row_start = new Int32Array(num_workers);
    var row_end = new Int32Array(num_workers);

    static_nnz(A_csr, num_workers, row_start, row_end);

    // CSR run for reorder format with static nnz partitioning  
    function runCSR(){
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr", i, row_start[i], row_end[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    // CSR run for reorder format with static nnz partitioning  
    function runCSR_gs(){
      console.log("Gather Scatter Vectorization");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr_gs", i, row_start[i], row_end[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    function storeCSR(event){
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          csr_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10)){
          if(gs == 0) 
	    runCSR();
	  else if(gs == 1) 
	    runCSR_gs();
	}
        else{
          tt = tt/1000;
          csr_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (csr_mflops - csr_flops[i]) * (csr_mflops - csr_flops[i]);
          variance /= outer_max;
          csr_sd = Math.sqrt(variance);
          csr_sum = fletcher_sum_y(y_view);
          pretty_print_y(y_view);
          console.log('csr sum is ', csr_sum);
          console.log('csr mflops is ', csr_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    if(gs == 0) 
      runCSR();
    else if(gs == 1) 
      runCSR_gs();
  });
}



function static_nnz_reorder_csr_test(A_csr_original, x_view, y_view, workers)
{
  return new Promise(function(resolve){
    console.log("CSR");
    if(typeof A_csr_original === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    console.log(calculate_csr_locality_index(A_csr_original));
    // sort CSR format by nnz per row
    var A_csr_sorted = sort_rows_by_nnz(A_csr_original);
    console.log(calculate_csr_locality_index(A_csr_sorted));
    console.log("CSR sorted");
    console.log("reordering A_csr");
    var A_csr = reorder_NN(A_csr_sorted, 16);
    console.log("reordered A_csr");
    console.log(calculate_csr_locality_index(A_csr));

    var t1, t2, tt = 0.0;
    var t = 0;
    var row_start = new Int32Array(num_workers);
    var row_end = new Int32Array(num_workers);

    static_nnz(A_csr, num_workers, row_start, row_end);

    // CSR run for reorder format with static nnz partitioning  
    function runCSR(){
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr", i, row_start[i], row_end[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }
	
    function storeCSR(event){
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          csr_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10))
          runCSR();
        else{
          tt = tt/1000;
          csr_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (csr_mflops - csr_flops[i]) * (csr_mflops - csr_flops[i]);
          variance /= outer_max;
          csr_sd = Math.sqrt(variance);
          sort_y_rows_by_nnz(y_view, A_csr);
          sort_y_rows_by_nnz(y_view, A_csr_sorted);
          csr_sum = fletcher_sum_y(y_view);
          pretty_print_y(y_view);
          console.log('csr sum is ', csr_sum);
          console.log('csr mflops is ', csr_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    runCSR();
  });
}


function csr_test(A_csr, x_view, y_view, workers, gs)
{
  return new Promise(function(resolve){
    console.log("CSR");
    if(typeof A_csr === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    //console.log("reordering A_csr");
    //var A_csr = reorder_NN(A_csr_original, 16);
    //console.log("reordered A_csr");
    print_nnz_per_worker(A_csr, num_workers);
    var t1, t2, tt = 0.0;
    var N_per_worker = Math.floor(N/num_workers);
    var rem_N  = N - N_per_worker * num_workers;
    var t = 0;
    function runCSR(){
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["csr", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["csr", i, i * N_per_worker, (i+1) * N_per_worker, A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    // CSR run for reorder format with static nnz partitioning  
    function runCSR_gs(){
      console.log("Gather Scatter Vectorization");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["csr_gs", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["csr_gs", i, i * N_per_worker, (i+1) * N_per_worker, A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    function storeCSR(event){
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          csr_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10)){
	  if(gs == 0)
            runCSR();
          else if(gs == 1)
            runCSR_gs();
	}
        else{
          tt = tt/1000;
          csr_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (csr_mflops - csr_flops[i]) * (csr_mflops - csr_flops[i]);
          variance /= outer_max;
          csr_sd = Math.sqrt(variance);
          //sort_y_rows_by_nnz(y_view, A_csr);
          csr_sum = fletcher_sum_y(y_view);
          pretty_print_y(y_view);
          console.log('csr sum is ', csr_sum);
          console.log('csr mflops is ', csr_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    if(gs == 0)
      runCSR();
    else if(gs == 1)
      runCSR_gs();
  });
}

function static_nnz_sorted_unrolled_csr_test(A_csr_original, x_view, y_view, workers, unroll_factor)
{
  return new Promise(function(resolve){
    console.log("CSR static nnz");
    if(typeof A_csr_original === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    console.log(calculate_csr_locality_index(A_csr_original));
    // sort CSR format by nnz per row
    var A_csr = sort_rows_by_nnz(A_csr_original);
    console.log("CSR sorted");
    console.log(calculate_csr_locality_index(A_csr));
    var t1, t2, tt = 0.0;
    var t = 0;
    var row_start = new Int32Array(num_workers);
    var row_end = new Int32Array(num_workers);
    var one_row = new Int32Array(num_workers);
    var two_row = new Int32Array(num_workers);
    var three_row = new Int32Array(num_workers);
    var four_row = new Int32Array(num_workers);
    // distribute almost equal number of nnzs to each worker & calculate number of rows with short length : 0, 1, 2, 3  
    static_nnz_special_codes(A_csr, num_workers, row_start, row_end, one_row, two_row, three_row, four_row);

    // CSR run for sorted format with static nnz partitioning  
    function runCSR(){
      console.log("CSR run");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr", i, row_start[i], row_end[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    // CSR run for sorted format with static nnz partitioning and unroll factor 2
    function run_unrolled2_CSR(){
      console.log("unrolled CSR run");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr_unroll_2", i, row_start[i], row_end[i], one_row[i], two_row[i], three_row[i], four_row[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    // CSR run for sorted format with static nnz partitioning and unroll factor 3
    function run_unrolled3_CSR(){
      console.log("unrolled CSR run");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr_unroll_3", i, row_start[i], row_end[i], one_row[i], two_row[i], three_row[i], four_row[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    // CSR run for sorted format with static nnz partitioning and unroll factor 4
    function run_unrolled4_CSR(){
      console.log("unrolled 4 CSR run");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr_unroll_4", i, row_start[i], row_end[i], one_row[i], two_row[i], three_row[i], four_row[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }

    // CSR run for sorted format with static nnz partitioning and unroll factor 6
    function run_unrolled6_CSR(){
      console.log("unrolled CSR run");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        workers.worker[i].postMessage(["csr_unroll_6", i, row_start[i], row_end[i], one_row[i], two_row[i], three_row[i], four_row[i], A_csr.row_index, A_csr.col_index, A_csr.val_index, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeCSR;
      }
    }	  
 
    function storeCSR(event){
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          csr_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10)){
          if(unroll_factor == 1)
            runCSR();
	  else if(unroll_factor == 2) 
            run_unrolled2_CSR();
	  else if(unroll_factor == 3) 
            run_unrolled3_CSR();
          else if(unroll_factor == 4)
            run_unrolled4_CSR();
          else if(unroll_factor == 6)
            run_unrolled6_CSR();
	}
        else{
          tt = tt/1000;
          csr_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (csr_mflops - csr_flops[i]) * (csr_mflops - csr_flops[i]);
          variance /= outer_max;
          csr_sd = Math.sqrt(variance);
          sort_y_rows_by_nnz(y_view, A_csr);
          csr_sum = fletcher_sum_y(y_view);
          pretty_print_y(y_view);
          console.log('csr sum is ', csr_sum);
          console.log('csr mflops is ', csr_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    if(unroll_factor == 1)
      runCSR();
    else if(unroll_factor == 2) 
      run_unrolled2_CSR();
    else if(unroll_factor == 3) 
      run_unrolled3_CSR();
    else if(unroll_factor == 4)
      run_unrolled4_CSR();
    else if(unroll_factor == 6)
      run_unrolled6_CSR();
  });
}


function dia_test(A_dia, x_view, y_view, workers)
{
  return new Promise(function(resolve){
    console.log("DIA");
    if(typeof A_dia === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    var t1, t2, tt = 0.0;
    var N_per_worker = Math.floor(N/num_workers);
    var rem_N  = N - N_per_worker * num_workers;
    var t = 0;
    function runDIA()
    {
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["dia_row", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_dia.offset_index, A_dia.data_index, A_dia.ndiags, N, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["dia_row", i, i * N_per_worker, (i+1) * N_per_worker, A_dia.offset_index, A_dia.data_index, A_dia.ndiags, N, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeDIA;
      }
    }

    function storeDIA(event){
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          dia_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10))
          runDIA();
        else{
          tt = tt/1000;
          dia_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (dia_mflops - dia_flops[i]) * (dia_mflops - dia_flops[i]);
          variance /= outer_max;
          dia_sd = Math.sqrt(variance);
          dia_sum = fletcher_sum_y(y_view);
          //pretty_print_DIA(A_dia);
          //pretty_print_y(y_view);
          console.log('dia sum is ', dia_sum);
          console.log('dia mflops is ', dia_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    runDIA();
  });
}

function diaII_test(A_diaII, x_view, y_view, workers)
{
  return new Promise(function(resolve){
    console.log("DIA II");
    if(typeof A_diaII === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    var t1, t2, tt = 0.0;
    var N_per_worker = Math.floor(N/num_workers);
    var rem_N  = N - N_per_worker * num_workers;
    console.log(N_per_worker, rem_N);
    var t = 0;
    function runDIAII()
    {
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["dia_col", i, i * N_per_worker, (i+1) * N_per_worker - 1 + rem_N, A_diaII.offset_index, A_diaII.data_index, A_diaII.ndiags, N, A_diaII.stride, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["dia_col", i, i * N_per_worker, (i+1) * N_per_worker - 1, A_diaII.offset_index, A_diaII.data_index, A_diaII.ndiags, N, A_diaII.stride, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeDIAII;
      }
    }
    function storeDIAII(event){
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          diaII_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10))
          runDIAII();
        else{
          tt = tt/1000;
          diaII_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (diaII_mflops - diaII_flops[i]) * (diaII_mflops - diaII_flops[i]);
          variance /= outer_max;
          diaII_sd = Math.sqrt(variance);
          diaII_sum = fletcher_sum_y(y_view);
          //pretty_print_DIAII(A_diaII);
          //pretty_print_y(y_view);
          //console.log('diaII sum is ', diaII_sum);
          //console.log('diaII mflops is ', diaII_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    runDIAII();
  });
}

function ell_test(A_ell, x_view, y_view, workers, gs)
{
  return new Promise(function(resolve){
    console.log("ELL");
    if(typeof A_ell === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    var t1, t2, tt = 0.0;
    var N_per_worker = Math.floor(N/num_workers);
    var rem_N  = N - N_per_worker * num_workers;
    var t = 0;
    function runELL()
    {
      console.log("unvectorized");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["ell_row", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_ell.indices_index, A_ell.data_index, A_ell.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["ell_row", i, i * N_per_worker, (i+1) * N_per_worker, A_ell.indices_index, A_ell.data_index, A_ell.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeELL;
      }
    }

    function runELL_gs()
    {
      console.log("vectorized");
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["ell_row_gs", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_ell.indices_index, A_ell.data_index, A_ell.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["ell_row_gs", i, i * N_per_worker, (i+1) * N_per_worker, A_ell.indices_index, A_ell.data_index, A_ell.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeELL;
      }
    }

    function storeELL(event)
    {
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          ell_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10)){
	  if(gs == 0)
            runELL();
	  else if(gs == 1)
            runELL_gs();
	}
        else{
          tt = tt/1000;
          ell_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (ell_mflops - ell_flops[i]) * (ell_mflops - ell_flops[i]);
          variance /= outer_max;
          ell_sd = Math.sqrt(variance);
          ell_sum = fletcher_sum_y(y_view);
          //pretty_print_y(y_view);
          console.log('ell sum is ', ell_sum);
          console.log('ell mflops is ', ell_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    if(gs == 0)
      runELL();
    else if(gs == 1)
      runELL_gs();
  });
}

function ellII_test(A_ellII, x_view, y_view, workers, gs)
{
  return new Promise(function(resolve){
    console.log("ELL II");
    if(typeof A_ellII === "undefined"){
      console.log("matrix is undefined");
      return resolve(-1);
    }
    if(typeof x_view === "undefined"){
      console.log("vector x is undefined");
      return resolve(-1);
    }
    if(typeof y_view === "undefined"){
      console.log("vector y is undefined");
      return resolve(-1);
    }
    var t1, t2, tt = 0.0;
    var N_per_worker = Math.floor(N/num_workers);
    var rem_N  = N - N_per_worker * num_workers;
    var t = 0;
    function runELLII()
    {
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["ell_col", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_ellII.indices_index, A_ellII.data_index, A_ellII.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["ell_col", i, i * N_per_worker, (i+1) * N_per_worker, A_ellII.indices_index, A_ellII.data_index, A_ellII.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeELLII;
      }
    }

    function runELLII_gs()
    {
      pending_workers = num_workers;
      clear_y(y_view);
      t1 = Date.now();
      for(var i = 0; i < num_workers; i++){
        if(i == num_workers - 1)
          workers.worker[i].postMessage(["ell_col_gs", i, i * N_per_worker, (i+1) * N_per_worker + rem_N, A_ellII.indices_index, A_ellII.data_index, A_ellII.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        else
          workers.worker[i].postMessage(["ell_col_gs", i, i * N_per_worker, (i+1) * N_per_worker, A_ellII.indices_index, A_ellII.data_index, A_ellII.ncols, N, x_view.x_index, y_view.y_index, inner_max]);
        workers.worker[i].onmessage = storeELLII;
      }
    }

    function storeELLII(event)
    {
      pending_workers -= 1;
      if(pending_workers <= 0){
        t2 = Date.now();
        if(t >= 10){
          ellII_flops[t-10] = 1/Math.pow(10,6) * 2 * anz * inner_max/ ((t2 - t1)/1000);
          tt += t2 - t1;
        }
        t++;
        if(t < (outer_max + 10)){
	  if(gs == 0)
            runELLII();
	  else if(gs == 1)
            runELLII_gs();
	}
        else{
          tt = tt/1000;
          ellII_mflops = 1/Math.pow(10,6) * 2 * anz * outer_max * inner_max/ tt;
          variance = 0;
          for(var i = 0; i < outer_max; i++)
            variance += (ellII_mflops - ellII_flops[i]) * (ellII_mflops - ellII_flops[i]);
          variance /= outer_max;
          ellII_sd = Math.sqrt(variance);
          ellII_sum = fletcher_sum_y(y_view);
          //pretty_print_y(y_view);
          console.log('ell II sum is ', ellII_sum);
          console.log('ell II mflops is ', ellII_mflops);
          console.log("Returned to main thread");
          return resolve(0);
        }
      }
    }
    if(gs == 0)
      runELLII();
    else if(gs == 1)
      runELLII_gs();
  });
}



function spmv_test(files, callback)
{
  console.log("inside test");
  var mm_info = new sswasm_MM_info();
  read_matrix_MM_files(files, num, mm_info, callback);
  N = mm_info.nrows;
  get_inner_max();

  var A_coo, A_csr, A_dia, A_ell, A_diaII, A_ellII, x_view, y_view;
  //[A_coo, A_csr, A_dia, A_ell, A_diaII, A_ellII, x_view, y_view] = allocate_memory_test(mm_info);

  console.log("memory allocated");
  //pretty_print_ELLII(A_ellII);

  A_coo = allocate_COO(mm_info);
  create_COO_from_MM(mm_info, A_coo);
  console.log("COO allocated");
  x_view = allocate_x(mm_info);
  init_x(x_view);
  y_view = allocate_y(mm_info);
  clear_y(y_view);

  var coo_promise = coo_test(A_coo, x_view, y_view, workers, 1);
  coo_promise.then(coo_value => {
    A_csr = allocate_CSR(mm_info);
    //convert COO to CSR
    coo_csr(A_coo, A_csr);
    free_memory_coo(A_coo);
    console.log("CSR allocated");
    //var csr_promise = static_nnz_reorder_csr_test(A_csr, x_view, y_view, workers);
    //var csr_promise = csr_test(A_csr, x_view, y_view, workers);
    var csr_promise = static_nnz_csr_test(A_csr, x_view, y_view, workers, 1);
    csr_promise.then(csr_value => {
      //var csr_sorted_nnz_promise = static_nnz_sorted_unrolled_csr_test(A_csr, x_view, y_view, workers, 4);
      //csr_sorted_nnz_promise.then(csr_sorted_nnz_value => {
      //get DIA info
        var result = num_diags(A_csr);
        var nd = result[0];
        var stride = result[1];
        if(nd*stride < Math.pow(2,27) && (((stride * nd)/anz) <= 12)){
          A_dia = allocate_DIA(mm_info, nd, stride);
          //convert CSR to DIA
          csr_dia(A_csr, A_dia);
	  /*var my_offset = new Int32Array(memory.buffer, A_dia.offset_index, A_dia.ndiags);
          for(var j = 0; j < A_dia.ndiags; j++)
            console.log(my_offset[j]);*/
        }
        var dia_promise = dia_test(A_dia, x_view, y_view, workers);
        dia_promise.then(dia_value => {
          free_memory_dia(A_dia);
          //get ELL info
          var nc = num_cols(A_csr);
          if((nc*mm_info.nrows < Math.pow(2,27)) && (((mm_info.nrows * nc)/anz) <= 12)){
            A_ell = allocate_ELL(mm_info, nc);
            //convert CSR to ELL
            csr_ell(A_csr, A_ell);
          }
          var ell_promise = ell_test(A_ell, x_view, y_view, workers, 1);
          ell_promise.then(ell_value => {
            free_memory_ell(A_ell);
            if(nd*stride < Math.pow(2,27) && (((stride * nd)/anz) <= 12)){
              A_diaII = allocate_DIA(mm_info, nd, stride);
              //convert CSR to DIAII
              csr_diaII(A_csr, A_diaII);
            }
            var diaII_promise = diaII_test(A_diaII, x_view, y_view, workers);
            diaII_promise.then(diaII_value => {
              //pretty_print_DIAII(A_diaII);
              //pretty_print_y(y_view);
              free_memory_dia(A_diaII);
              if((nc*mm_info.nrows < Math.pow(2,27)) && (((mm_info.nrows * nc)/anz) <= 12)){
                A_ellII = allocate_ELL(mm_info, nc);
                //convert CSR to ELLII
                csr_ellII(A_csr, A_ellII);
              }
              var ellII_promise = ellII_test(A_ellII, x_view, y_view, workers, 1);
              ellII_promise.then(ellII_value => {
                free_memory_ell(A_ellII);
                free_memory_csr(A_csr);
                free_memory_x(x_view);
                free_memory_y(y_view);
                //pretty_print_y(y_view);
                //free_memory_test(A_coo, A_csr, A_dia, A_ell, A_diaII, A_ellII, x_view, y_view);
                console.log("done");
                callback();
              });
            });
          });
        });
      });
    //});
  });
}



function spmv(callback)
{
  let promise = load_file();
  promise.then(
    files => spmv_test(files, callback),
    error => callback()
  ); 
}