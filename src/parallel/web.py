import os
import subprocess
import sys
import json

from bottle import route, run, static_file

@route('/static/<name>')
def get_file(name):
  response = static_file(name, root=os.getcwd())
  response.set_header('Cache-Control', 'no-cache, max-age=0')
  #response.set_header('Expires', '0')
  #response.set_header('Pragma', 'no-cache')
  return response

@route('/result/<json_string>')
def result(json_string):
  parsed_json = json.loads(json_string) 
  output_file = parsed_json['output_file']
  f = open(os.path.join(os.getcwd(), output_file),'a')
  browser = parsed_json['browser']
  f.write(parsed_json['file'])
  f.write(",")
  f.write(str(parsed_json['num_workers']))
  f.write(",")
  f.write(str(parsed_json['outer_max']))
  f.write(",")
  f.write(str(parsed_json['inner_max']))
  f.write(",")
  f.write(str(parsed_json['N']))
  f.write(",")
  f.write(str(parsed_json['nnz']))
  f.write(",")

  tests = parsed_json['tests'] 

  if tests == 'dia':
    f.write(str(parsed_json['dia_row_sd']))
    f.write(",")
    f.write(str(parsed_json['dia_row']))
    f.write(",")
    f.write(str(parsed_json['dia_row_sum']))
    f.write(",")
    f.write(str(parsed_json['bdia_row_sd']))
    f.write(",")
    f.write(str(parsed_json['bdia_row']))
    f.write(",")
    f.write(str(parsed_json['bdia_row_sum']))
    f.write(",")
    f.write(str(parsed_json['dia_nnz_sd']))
    f.write(",")
    f.write(str(parsed_json['dia_nnz']))
    f.write(",")
    f.write(str(parsed_json['dia_nnz_sum']))
    f.write(",")
    f.write(str(parsed_json['bdia_nnz_sd']))
    f.write(",")
    f.write(str(parsed_json['bdia_nnz']))
    f.write(",")
    f.write(str(parsed_json['bdia_nnz_sum']))

  if tests == 'ell':
    f.write(str(parsed_json['ell_col_sd']))
    f.write(",")
    f.write(str(parsed_json['ell_col']))
    f.write(",")
    f.write(str(parsed_json['ell_col_sum']))
    f.write(",")
    f.write(str(parsed_json['ell_gs_sd']))
    f.write(",")
    f.write(str(parsed_json['ell_gs']))
    f.write(",")
    f.write(str(parsed_json['ell_gs_sum']))
    f.write(",")
    f.write(str(parsed_json['bell_gs_sd']))
    f.write(",")
    f.write(str(parsed_json['bell_gs']))
    f.write(",")
    f.write(str(parsed_json['bell_gs_sum']))

  if tests == 'coo':
    f.write(str(parsed_json['coo_sd']))
    f.write(",")
    f.write(str(parsed_json['coo']))
    f.write(",")
    f.write(str(parsed_json['coo_sum']))

  if tests == 'csr':
    f.write(str(parsed_json['csr_row_sd']))
    f.write(",")
    f.write(str(parsed_json['csr_row']))
    f.write(",")
    f.write(str(parsed_json['csr_row_sum']))
    f.write(",")
    f.write(str(parsed_json['csr_row_gs_sd']))
    f.write(",")
    f.write(str(parsed_json['csr_row_gs']))
    f.write(",")
    f.write(str(parsed_json['csr_row_gs_sum']))
    f.write(",")
    f.write(str(parsed_json['csr_nnz_sd']))
    f.write(",")
    f.write(str(parsed_json['csr_nnz']))
    f.write(",")
    f.write(str(parsed_json['csr_nnz_sum']))
    f.write(",")
    f.write(str(parsed_json['csr_nnz_gs_sd']))
    f.write(",")
    f.write(str(parsed_json['csr_nnz_gs']))
    f.write(",")
    f.write(str(parsed_json['csr_nnz_gs_sum']))

  if tests == 'all':
    f.write(str(parsed_json['coo_sd']))
    f.write(",")
    f.write(str(parsed_json['coo']))
    f.write(",")
    f.write(str(parsed_json['coo_sum']))
    f.write(",")
    f.write(str(parsed_json['csr_sd']))
    f.write(",")
    f.write(str(parsed_json['csr']))
    f.write(",")
    f.write(str(parsed_json['csr_sum']))
    f.write(",")
    f.write(str(parsed_json['dia_sd']))
    f.write(",")
    f.write(str(parsed_json['dia']))
    f.write(",")
    f.write(str(parsed_json['dia_sum']))
    f.write(",")
    f.write(str(parsed_json['ell_sd']))
    f.write(",")
    f.write(str(parsed_json['ell']))
    f.write(",")
    f.write(str(parsed_json['ell_sum']))

  f.write("\n")
  f.close()
  if browser == 0:
    subprocess.call(['killall', '-9', 'chrome']);
  elif browser == 1:
    subprocess.call(['killall', '-9', 'firefox']);
  return "OK"
run(host='localhost', port=8080, quiet=True)
