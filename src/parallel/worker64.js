function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}

onmessage = function(e) {
  if(e.data[0] == 0){
    id = e.data[1];
    let mod = e.data[2];
    let memory = e.data[3];
    (async () => {
    let instance = WebAssembly.instantiate(mod, { js: { mem: memory }, console: {
    log: function(arg) {
      console.log(arg);
    }}});
    my_instance = await instance;
    })(); 
    postMessage(id); 
  }
  if(e.data[0] == 1){
    assert(id == e.data[1], "Worker IDs don't match."); 
    let start = e.data[2];
    let end = e.data[3];
    let coo_row_index = start * 4 + e.data[4];
    let coo_col_index = start * 4 + e.data[5];
    let coo_val_index = start * 8 + e.data[6];
    let x_index = e.data[7];
    let y_index = e.data[8];
    let inside_max = e.data[9];
    my_instance.exports.spmv_coo_wrapper(id, coo_row_index, coo_col_index, coo_val_index, x_index, y_index, end-start, inside_max);
    postMessage(id); 
  }
  if(e.data[0] == 2){
    assert(id == e.data[1], "Worker IDs don't match."); 
    let start = e.data[2];
    let end = e.data[3];
    let csr_row_index = start * 4 + e.data[4];
    let csr_col_index = e.data[5];
    let csr_val_index = e.data[6];
    let x_index = e.data[7];
    let y_index = start * 8 + e.data[8];
    let inside_max = e.data[9];
    my_instance.exports.spmv_csr_wrapper(id, csr_row_index, csr_col_index, csr_val_index, x_index, y_index, end-start, inside_max);
    postMessage(id); 
  }
  if(e.data[0] == 3){
    assert(id == e.data[1], "Worker IDs don't match."); 
    let start = e.data[2];
    let end = e.data[3];
    let offset_index = e.data[4];
    let dia_data_index = e.data[5];
    let num_diag = e.data[6];
    let N = e.data[7];
    let x_index = e.data[8];
    let y_index = e.data[9];
    let inside_max = e.data[10];
    my_instance.exports.spmv_dia_wrapper(id, offset_index, dia_data_index, start, end, num_diag, N, x_index, y_index, inside_max);
    postMessage(id);
  }
  if(e.data[0] == 4){
    assert(id == e.data[1], "Worker IDs don't match."); 
    let start = e.data[2];
    let end = e.data[3];
    let indices_index = e.data[4];
    let ell_data_index = e.data[5];
    let num_cols = e.data[6];
    let N = e.data[7];
    let x_index = e.data[8];
    let y_index = e.data[9];
    let inside_max = e.data[10];
    my_instance.exports.spmv_ell_wrapper(id, indices_index, ell_data_index, start, end, num_cols, N, x_index, y_index, inside_max);
    postMessage(id);
  }
  if(e.data[0] == 5){
    assert(id == e.data[1], "Worker IDs don't match.");
    let start = e.data[2];
    let end = e.data[3];
    let offset_index = e.data[4];
    let dia_data_index = e.data[5];
    let num_diag = e.data[6];
    let N = e.data[7];
    let stride = e.data[8];
    let x_index = e.data[9];
    let y_index = e.data[10];
    let inside_max = e.data[11];
    my_instance.exports.spmv_diaII_wrapper(id, offset_index, dia_data_index, start, end, num_diag, N, stride, x_index, y_index, inside_max);
    postMessage(id);
  }
  if(e.data[0] == 6){
    assert(id == e.data[1], "Worker IDs don't match.");
    let start = e.data[2];
    let end = e.data[3];
    let indices_index = e.data[4];
    let ell_data_index = e.data[5];
    let num_cols = e.data[6];
    let N = e.data[7];
    let x_index = e.data[8];
    let y_index = e.data[9];
    let inside_max = e.data[10];
    my_instance.exports.spmv_ellII_wrapper(id, indices_index, ell_data_index, start, end, num_cols, N, x_index, y_index, inside_max);
    postMessage(id);
  }
}
