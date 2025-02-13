from selenium import webdriver
from selenium.webdriver.common.by import By
import sys
import os

from Bio.SeqIO import parse as SeqIO_parse

args = dict(zip(['script', 'input_path', 'job_id'], sys.argv))

def create_webdriver():
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-dev-shm-usage')
    return webdriver.Chrome(options=chrome_options)

def parse_results(to_w):
    out_string = ""
    for line in to_w[1:]:
        parts = line.split()
        if len(parts) != 6 and parts[3] != 'B':
            out_string += "\n" + ",".join([parts[1], parts[2], parts[3], parts[6], parts[7]])
        else:
            out_string += "\n" + ",".join([parts[1], parts[2], parts[3], parts[4], parts[5]])
    return out_string

def get_geno2pheno_results(driver, txt_field):
    driver.find_element(By.XPATH, '//*[@id="g2pmain"]/div/center/table/tbody/tr[5]/td/select/option[8]').click()
    seq_field = driver.find_element(By.XPATH, '//*[@id="g2pmain"]/div/center/table/tbody/tr[8]/td/textarea')
    seq_field.send_keys(txt_field)
    driver.find_element(By.XPATH, '//*[@id="XactionCell"]/input').click()
    return driver.find_element(By.XPATH, '//*[@id="g2pmain"]/div/table[2]')

def new_input(driver):
    driver.find_element(By.XPATH, '//*[@id="g2pmain"]/table/tbody/tr/td[2]/input').click()
    driver.find_element(By.XPATH, '//*[@id="g2pmain"]/div/center/table/tbody/tr[1]/td/input').clear()
    driver.find_element(By.XPATH, '//*[@id="g2pmain"]/div/center/table/tbody/tr[8]/td/textarea').clear()

def parse_fasta(file_path):
    patID_seq = {}
    with open(file_path, 'r') as seq_file:
        lines = seq_file.readlines()
    seq_nextline_in = ""
    for i, line in enumerate(lines):
        if line.startswith('>'):
            id = line[1:].strip()
        else:
            seq_nextline_in += line.strip()
            if i + 1 == len(lines) or lines[i + 1].startswith('>'):
                patID_seq[id] = seq_nextline_in
                seq_nextline_in = ""
    return patID_seq

def process():
    input_path = args['input_path']

    job_id = args['job_id'] or 'Geno2PhenoTest_log'

    output_path = input_path

    seqs = []

    if os.path.isfile(input_path):
        output_path = os.path.dirname(input_path)
        if ".fa" in input_path:
            seqs.extend(
                SeqIO_parse(input_path, "fasta")
            )
    else:
        for filename in os.listdir(input_path):
            if ".fa" in filename:
                file = os.path.join(input_path, filename)
                seqs.extend(
                    SeqIO_parse(file, "fasta")
                )

    log_file_path = os.path.join(output_path, f"{job_id}.csv")

    seqs = list(seqs)

    num_seqs = len(seqs)

    print(f"Number of sequences: {num_seqs}")

    # group into sets of 50 to respect geno2pheno's limit
    grouped_seqs = [seqs[i:i + 50] for i in range(0, num_seqs, 50)]

    # create header for csv
    csv_output = ",".join(['ID', 'V3 Loop', 'Subtype', 'FPR', 'Percentage'])

    driver = create_webdriver()
    driver.get('https://coreceptor.geno2pheno.org/')

    for group in grouped_seqs:
        txt_field = ''.join(f'>{seq.id}\n{seq.seq}\n' for seq in group)
        table = get_geno2pheno_results(driver, txt_field)
        results_arr = table.text.split('\n')
        csv_output += parse_results(results_arr)
        new_input(driver)

    with open(log_file_path, 'w') as log_file:
        log_file.write(csv_output)

    driver.quit()

if __name__ == "__main__":
    process()
