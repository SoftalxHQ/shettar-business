import com.android.build.api.dsl.ApplicationExtension
import org.gradle.api.DefaultTask
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.get

const val TASK_GROUP = "rust"

open class Config {
    lateinit var rootDirRel: String
}

open class RustPlugin : Plugin<Project> {
    private lateinit var config: Config

    override fun apply(project: Project) = with(project) {
        config = extensions.create("rust", Config::class.java)

        // Default arm64-only — multi-ABI fills CI runners. Override via gradle.properties:
        //   abiList=arm64-v8a,armeabi-v7a,x86,x86_64
        //   archList=arm64,arm,x86,x86_64
        //   targetList=aarch64,armv7,i686,x86_64
        val defaultAbiList = listOf("arm64-v8a")
        val defaultArchList = listOf("arm64")
        val defaultTargetList = listOf("aarch64")

        val abiList = (findProperty("abiList") as? String)?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }
            ?: defaultAbiList
        val archList = (findProperty("archList") as? String)?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }
            ?: defaultArchList
        val targetsList = (findProperty("targetList") as? String)?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }
            ?: defaultTargetList

        require(abiList.size == archList.size && archList.size == targetsList.size) {
            "abiList, archList, and targetList must have the same length (got ${abiList.size}, ${archList.size}, ${targetsList.size})"
        }

        extensions.configure<ApplicationExtension> {
            @Suppress("UnstableApiUsage")
            flavorDimensions.add("abi")
            productFlavors {
                create("universal") {
                    dimension = "abi"
                    ndk {
                        abiFilters += abiList
                    }
                }
                archList.forEachIndexed { index, arch ->
                    create(arch) {
                        dimension = "abi"
                        ndk {
                            abiFilters.add(abiList[index])
                        }
                    }
                }
            }
        }

        afterEvaluate {
            for (profile in listOf("debug", "release")) {
                val profileCapitalized = profile.replaceFirstChar { it.uppercase() }
                val buildTask = tasks.maybeCreate(
                    "rustBuildUniversal$profileCapitalized",
                    DefaultTask::class.java
                ).apply {
                    group = TASK_GROUP
                    description = "Build dynamic library in $profile mode for all configured targets"
                }

                tasks["mergeUniversal${profileCapitalized}JniLibFolders"].dependsOn(buildTask)

                for (targetPair in targetsList.withIndex()) {
                    val targetName = targetPair.value
                    val targetArch = archList[targetPair.index]
                    val targetArchCapitalized = targetArch.replaceFirstChar { it.uppercase() }
                    val targetBuildTask = project.tasks.maybeCreate(
                        "rustBuild$targetArchCapitalized$profileCapitalized",
                        BuildTask::class.java
                    ).apply {
                        group = TASK_GROUP
                        description = "Build dynamic library in $profile mode for $targetArch"
                        rootDirRel = config.rootDirRel
                        target = targetName
                        release = profile == "release"
                    }

                    buildTask.dependsOn(targetBuildTask)
                    tasks["merge$targetArchCapitalized${profileCapitalized}JniLibFolders"].dependsOn(
                        targetBuildTask
                    )
                }
            }
        }
    }
}
