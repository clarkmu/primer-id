<?php

// set location variables found in tcs-dr.php and ogv.php

// $PRIVATE_KEY_FILE is not included in the repository.  create your own GCP bucket credentials file

if( isset($IS_TCSDR ) ){
    $API_URL =  "$WEBSITE_URL/api/tcsdr";
    $BASE = $IS_DEV ? "$TILDA/tcs-dr" : "/your/main/directory";
    $LOCK_FILE = "$BASE/var/run/locked-tcs-dr";
    $PRIVATE_KEY_FILE = $IS_DEV ? "$TILDA/code/tcs-dr/node/assets/storage-admin.json" : "$BASE/storage-admin.json";
    $SCRATCH_SPACE = $IS_DEV ? "$TILDA/tcs-dr" : "/scratch/space/on/server";
    $RUBY_SERVER = $IS_DEV ? "localhost:9292" : "yourserver.ruby.com";
    $BUCKET_URL = "gs://tcs-dr";
    $LOG_DIR = $IS_DEV ? $BASE : "$BASE/output/tcsdr";
}else if( isset($IS_OGV) ){
    $API_URL = "$WEBSITE_URL/api/ogv";
    $BASE = $IS_DEV ? "$TILDA/ogv-submissions" : "/your/main/directory";
    $LOCK_FILE = $IS_DEV ? "$BASE/locked-ogv-dating" : "$BASE/locked-ogv-dating";
    $PRIVATE_KEY_FILE = $IS_DEV ? "$TILDA/storage-admin.json" : "$BASE/storage-admin.json";
    $SCRATCH_SPACE = $IS_DEV ? $BASE : "/scratch/space/on/server";
    $LOG_DIR = $IS_DEV ? $BASE : "$BASE/output/ogv-dating";
    $BUCKET_URL = "gs://ogv-dating";
}else if( isset($IS_INTACTNESS) ){
    $API_URL = "$WEBSITE_URL/api/intactness";
    $BASE = $IS_DEV ? "$TILDA/intact" : "/your/main/directory";
    $LOCK_FILE = $IS_DEV ? "$BASE/locked-intact" : "$BASE/locked-intact";
    $PRIVATE_KEY_FILE = $IS_DEV ? "$TILDA/storage-admin.json" : "$BASE/storage-admin.json";
    $SCRATCH_SPACE = $IS_DEV ? $BASE : "/scratch/space/on/server";
    $LOG_DIR = $IS_DEV ? $BASE : "$BASE/output/intact";
    $BUCKET_URL = "gs://intact";
}

?>