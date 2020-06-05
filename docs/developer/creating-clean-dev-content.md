## Creating Clean Development Content

If you are trying to fix an issue, it is helpful to begin development using content that is known to support common Tangerine features. This can be more reliable than using a project's content because that content may have missing forms that create bugs that have nothing to do with the issue you are trying to resolve. 

The `create-group` command to the rescue!

The following command downloads a content set known to support comon Tangerine features and is used for load-testing. Notice that it is a github repo; therefore, you may clone it and modify at will. 

`docker exec tangerine create-group "New Group C" https://github.com/rjsteinert/tangerine-content-set-test.git`

If you add `--help` to the `create-group` command you may see other options as well.

`docker exec tangerine create-group --help`